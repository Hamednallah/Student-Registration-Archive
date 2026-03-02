# AWS Deployment Guide — v2.1
## Complete Infrastructure, Delivery, and Operations

---

## Architecture Overview

```
                        ┌──────────────────────────────────────────────┐
                        │                   AWS Cloud                   │
                        │            Region: me-south-1 (Bahrain)       │
                        │                                                │
Internet ───── Route53 ─┤                                                │
    HTTPS              │  ┌────────────────────────────────────────┐    │
                        │  │             CloudFront CDN              │    │
                        │  │  (Web static assets + API edge cache)  │    │
                        │  └────────────────┬───────────────────────┘    │
                        │                   │                            │
                        │  ┌────────────────▼───────────────────────┐    │
                        │  │        Application Load Balancer        │    │
                        │  │        (HTTPS termination + WAF)        │    │
                        │  └────────┬───────────────────┬───────────┘    │
                        │           │                   │                │
                        │  ┌────────▼───────┐  ┌───────▼────────────┐   │
                        │  │  ECS Fargate   │  │     S3 Bucket      │   │
                        │  │  (API Tasks)   │  │  (Web static SPA)  │   │
                        │  │  2–10 tasks    │  │                    │   │
                        │  └────────┬───────┘  └────────────────────┘   │
                        │           │                                    │
                        │  ┌────────▼──────────────────────────────┐    │
                        │  │              Private Subnet             │    │
                        │  │  ┌──────────────┐  ┌───────────────┐  │    │
                        │  │  │  RDS Postgres  │  │  ElastiCache  │  │    │
                        │  │  │  15 Multi-AZ  │  │   Redis 7     │  │    │
                        │  │  └──────────────┘  └───────────────┘  │    │
                        │  └───────────────────────────────────────┘    │
                        │                                                │
                        │  Other: ECR, Secrets Manager, S3 (backups),   │
                        │         CloudWatch, SNS, SES, WAF             │
                        └──────────────────────────────────────────────┘
```

---

## Terraform Structure

```
terraform/
├── main.tf              — Provider config, backend
├── variables.tf         — All input variables
├── outputs.tf           — Key output values
├── modules/
│   ├── networking/      — VPC, subnets, security groups
│   ├── compute/         — ECS cluster, task definitions, service
│   ├── database/        — RDS PostgreSQL
│   ├── cache/           — ElastiCache Redis
│   ├── storage/         — S3 buckets (web, backups)
│   ├── cdn/             — CloudFront distribution
│   ├── dns/             — Route 53 records
│   ├── security/        — WAF, ACM certificates, IAM roles
│   └── monitoring/      — CloudWatch, alarms, dashboards
├── environments/
│   ├── production/
│   │   ├── main.tf      — Calls all modules
│   │   ├── terraform.tfvars
│   │   └── backend.tf   — S3 state backend
│   └── staging/
│       ├── main.tf
│       └── terraform.tfvars
```

---

## File: `terraform/main.tf`

```hcl
terraform {
  required_version = ">= 1.7.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    # Configured per environment in environments/*/backend.tf
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "psau-academic-system"
      Environment = var.environment
      ManagedBy   = "terraform"
      Version     = var.app_version
    }
  }
}
```

---

## File: `terraform/modules/networking/main.tf`

```hcl
# VPC — isolated network for all PSAU resources
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr          # 10.0.0.0/16
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "psau-vpc-${var.environment}" }
}

# Public subnets — ALB, NAT gateways
resource "aws_subnet" "public" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = var.availability_zones[count.index]
  
  map_public_ip_on_launch = false   # Explicit public IP assignment only

  tags = { Name = "psau-public-${var.availability_zones[count.index]}" }
}

# Private subnets — ECS tasks, RDS, ElastiCache
resource "aws_subnet" "private" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = { Name = "psau-private-${var.availability_zones[count.index]}" }
}

# Internet Gateway — public subnet egress
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "psau-igw" }
}

# NAT Gateway — private subnet egress (for ECS pulling images, etc.)
resource "aws_eip" "nat" {
  count  = length(var.availability_zones)
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  count         = length(var.availability_zones)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  tags          = { Name = "psau-nat-${var.availability_zones[count.index]}" }
}

# Security Groups
resource "aws_security_group" "alb" {
  name_prefix = "psau-alb-"
  vpc_id      = aws_vpc.main.id
  description = "Allow inbound HTTPS from internet"

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]   # Redirect to HTTPS
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "api" {
  name_prefix = "psau-api-"
  vpc_id      = aws_vpc.main.id
  description = "Allow inbound from ALB only"

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "database" {
  name_prefix = "psau-db-"
  vpc_id      = aws_vpc.main.id
  description = "Allow inbound PostgreSQL from API tasks only"

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }
  # No egress needed for database
}

resource "aws_security_group" "redis" {
  name_prefix = "psau-redis-"
  vpc_id      = aws_vpc.main.id
  description = "Allow inbound Redis from API tasks only"

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.api.id]
  }
}
```

---

## File: `terraform/modules/database/main.tf`

```hcl
resource "aws_db_subnet_group" "main" {
  name       = "psau-db-subnets"
  subnet_ids = var.private_subnet_ids

  tags = { Name = "psau-db-subnet-group" }
}

resource "aws_rds_cluster_parameter_group" "main" {
  family = "aurora-postgresql15"
  name   = "psau-pg15-params"

  parameter {
    name  = "shared_buffers"
    value = "262144"  # 256MB in 8KB pages
  }
  parameter {
    name  = "log_min_duration_statement"
    value = "1000"    # Log queries over 1 second
  }
  parameter {
    name  = "log_connections"
    value = "1"
  }
}

resource "aws_db_instance" "main" {
  identifier     = "psau-postgres-${var.environment}"
  engine         = "postgres"
  engine_version = "15.4"
  
  instance_class = var.db_instance_class   # db.t4g.medium (prod), db.t4g.small (staging)
  
  # Storage
  allocated_storage     = 100             # GB
  max_allocated_storage = 500             # Auto-scale to 500GB
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.rds.arn

  # Database
  db_name  = "psau"
  username = "psau_admin"
  password = random_password.db.result    # Stored in Secrets Manager

  # High availability
  multi_az               = var.environment == "production"
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.db_security_group_id]

  # Backup
  backup_retention_period = 30     # 30-day automated backups
  backup_window          = "03:00-04:00"  # 3-4am UTC
  maintenance_window     = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot  = true
  deletion_protection    = var.environment == "production"

  # Monitoring
  monitoring_interval          = 60
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled = true
  performance_insights_retention_period = 7   # days

  # Updates
  auto_minor_version_upgrade = true
  apply_immediately          = false   # Apply maintenance window

  parameter_group_name = aws_db_parameter_group.main.name

  tags = { Name = "psau-postgres-${var.environment}" }
}

# Store credentials in Secrets Manager
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "psau/${var.environment}/db-credentials"
  recovery_window_in_days = 7
  kms_key_id              = aws_kms_key.secrets.arn
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = aws_db_instance.main.username
    password = random_password.db.result
    host     = aws_db_instance.main.endpoint
    port     = aws_db_instance.main.port
    dbname   = aws_db_instance.main.db_name
  })
}
```

---

## File: `terraform/modules/compute/main.tf`

```hcl
# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "psau-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1     # Always at least 1 FARGATE (not SPOT) task for stability
  }
}

# IAM Role for ECS Task Execution (pulling images, writing logs)
resource "aws_iam_role" "ecs_execution" {
  name = "psau-ecs-execution-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow ECS to read from Secrets Manager
resource "aws_iam_role_policy" "ecs_secrets" {
  name = "psau-ecs-secrets"
  role = aws_iam_role.ecs_execution.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = ["arn:aws:secretsmanager:${var.aws_region}:${var.aws_account_id}:secret:psau/${var.environment}/*"]
    }]
  })
}

# Task Role — what the running container can do
resource "aws_iam_role" "ecs_task" {
  name = "psau-ecs-task-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "ecs_task" {
  name = "psau-task-policy"
  role = aws_iam_role.ecs_task.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # S3 access for backups
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.backup_bucket_name}",
          "arn:aws:s3:::${var.backup_bucket_name}/*"
        ]
      },
      {
        # SES for email
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
        Condition = {
          StringEquals = { "ses:FromAddress" = var.ses_from_address }
        }
      },
      {
        # CloudWatch custom metrics
        Effect   = "Allow"
        Action   = ["cloudwatch:PutMetricData"]
        Resource = "*"
        Condition = {
          StringEquals = { "cloudwatch:namespace" = "PSAU/Application" }
        }
      }
    ]
  })
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/psau-api-${var.environment}"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.logs.arn
}

# ECS Task Definition
resource "aws_ecs_task_definition" "api" {
  family                   = "psau-api-${var.environment}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu     # 512 (staging), 1024 (prod)
  memory                   = var.task_memory  # 1024 (staging), 2048 (prod)
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "psau-api"
    image = "${var.ecr_repository_url}/psau-api:latest"
    
    portMappings = [{
      containerPort = 8080
      protocol      = "tcp"
    }]
    
    # Secrets from Secrets Manager — never in plain env vars
    secrets = [
      {
        name      = "JWT_SECRET"
        valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${var.aws_account_id}:secret:psau/${var.environment}/jwt-secrets:jwt_secret::"
      },
      {
        name      = "JWT_REFRESH_SECRET"
        valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${var.aws_account_id}:secret:psau/${var.environment}/jwt-secrets:jwt_refresh_secret::"
      },
      {
        name      = "DATABASE_URL"
        valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${var.aws_account_id}:secret:psau/${var.environment}/db-url::"
      },
      {
        name      = "REDIS_URL"
        valueFrom = "arn:aws:secretsmanager:${var.aws_region}:${var.aws_account_id}:secret:psau/${var.environment}/redis-url::"
      }
    ]
    
    # Non-sensitive environment variables
    environment = [
      { name = "NODE_ENV",                    value = "production" },
      { name = "PORT",                        value = "8080" },
      { name = "LOG_LEVEL",                   value = "info" },
      { name = "REDIS_ENABLED",               value = "true" },
      { name = "BACKUP_SCHEDULER_ENABLED",    value = "true" },
      { name = "CORS_ORIGINS",                value = var.cors_origins },
      { name = "AWS_REGION",                  value = var.aws_region },
      { name = "AWS_S3_BACKUP_BUCKET",        value = var.backup_bucket_name },
      { name = "APP_VERSION",                 value = var.app_version }
    ]
    
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "api"
      }
    }
    
    healthCheck = {
      command     = ["CMD-SHELL", "wget -qO- http://localhost:8080/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
    
    # Resource limits at container level (defense in depth)
    ulimits = [{
      name      = "nofile"
      softLimit = 65536
      hardLimit = 65536
    }]
    
    readonlyRootFilesystem = true
    
    tmpfs = [{
      containerPath = "/tmp"
      size          = 512
    }]
  }])
}

# ECS Service with Auto-Scaling
resource "aws_ecs_service" "api" {
  name                               = "psau-api"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.api.arn
  desired_count                      = var.api_desired_count   # 2 in prod
  launch_type                        = null   # Use capacity providers
  scheduling_strategy                = "REPLICA"
  health_check_grace_period_seconds  = 60
  wait_for_steady_state              = true

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = var.environment == "production" ? 2 : 1
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.api_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "psau-api"
    container_port   = 8080
  }

  deployment_configuration {
    minimum_healthy_percent = 100
    maximum_percent         = 200

    deployment_circuit_breaker {
      enable   = true
      rollback = true   # Auto-rollback on failure
    }
  }

  lifecycle {
    ignore_changes = [task_definition, desired_count]  # Managed by CI/CD
  }
}

# Auto-Scaling
resource "aws_appautoscaling_target" "api" {
  max_capacity       = 10
  min_capacity       = var.environment == "production" ? 2 : 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/psau-api"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api_cpu" {
  name               = "psau-api-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 70.0   # Scale when CPU > 70%
    scale_in_cooldown  = 300    # 5 minutes before scaling in
    scale_out_cooldown = 60     # 1 minute before scaling out

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

resource "aws_appautoscaling_policy" "api_memory" {
  name               = "psau-api-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 80.0   # Scale when memory > 80%
    scale_in_cooldown  = 300
    scale_out_cooldown = 60

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
  }
}
```

---

## File: `terraform/modules/security/waf.tf`

```hcl
# AWS WAF — Web Application Firewall
resource "aws_wafv2_web_acl" "main" {
  name  = "psau-waf-${var.environment}"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting — 2000 requests per 5 minutes per IP
  rule {
    name     = "RateLimit"
    priority = 1

    action { block {} }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "psau-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Rules — Common attack patterns
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "psau-common-rules"
      sampled_requests_enabled   = true
    }
  }

  # SQL Injection protection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 3

    override_action { none {} }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "psau-sqli-rules"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "psau-waf"
    sampled_requests_enabled   = true
  }
}
```

---

## Delivery Steps — Ordered, No Ambiguity

### Step 1: Pre-Deployment Checklist

```bash
# Verify all of these pass before any prod deployment:

# 1. All CI checks green
# 2. Security scan passes (no HIGH/CRITICAL vulnerabilities)
# 3. E2E tests pass in test environment
# 4. Smoke tests pass against staging environment
# 5. Database migrations are backward-compatible
#    (old code can run against new schema — for zero-downtime deploy)
# 6. Performance benchmarks haven't regressed
# 7. Changelog updated
# 8. Version bumped (semantic versioning)
```

### Step 2: First-Time AWS Infrastructure Setup

```bash
# Install tools
brew install terraform awscli
aws configure --profile psau-prod

# Initialize Terraform backend (S3 state)
aws s3 mb s3://psau-terraform-state-${AWS_ACCOUNT_ID} \
  --region me-south-1
aws s3api put-bucket-versioning \
  --bucket psau-terraform-state-${AWS_ACCOUNT_ID} \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption \
  --bucket psau-terraform-state-${AWS_ACCOUNT_ID} \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Initialize Terraform
cd terraform/environments/production
terraform init \
  -backend-config="bucket=psau-terraform-state-${AWS_ACCOUNT_ID}" \
  -backend-config="key=psau/production/terraform.tfstate" \
  -backend-config="region=me-south-1"

# Plan (review before applying)
terraform plan -out=tfplan

# Apply
terraform apply tfplan
```

### Step 3: Secrets Setup (One-Time)

```bash
# Generate strong secrets
JWT_SECRET=$(openssl rand -base64 48)
JWT_REFRESH_SECRET=$(openssl rand -base64 48)
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)

# Store in AWS Secrets Manager
aws secretsmanager create-secret \
  --name psau/production/jwt-secrets \
  --secret-string "{\"jwt_secret\":\"${JWT_SECRET}\",\"jwt_refresh_secret\":\"${JWT_REFRESH_SECRET}\"}" \
  --region me-south-1

aws secretsmanager create-secret \
  --name psau/production/db-credentials \
  --secret-string "{\"password\":\"${DB_PASSWORD}\",...}" \
  --region me-south-1

# Record these somewhere secure — you'll need them to set DATABASE_URL
```

### Step 4: Database Migration (First Deploy)

```bash
# Run migrations against production RDS
# Use a temporary ECS task (not a local connection — security)

aws ecs run-task \
  --cluster psau-production \
  --task-definition psau-api-migrate \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${PRIVATE_SUBNET_ID}],securityGroups=[${API_SG_ID}]}" \
  --overrides '{"containerOverrides":[{"name":"psau-api","command":["node","dist/db/migrate.js"]}]}'

# Wait for migration task to complete
aws ecs wait tasks-stopped --cluster psau-production --tasks [task-arn]

# Check exit code
aws ecs describe-tasks \
  --cluster psau-production \
  --tasks [task-arn] \
  --query 'tasks[0].containers[0].exitCode'
# Must be 0
```

### Step 5: Initial Data Seed (One-Time)

```bash
# Seed initial admin user and university structure
# Same pattern as migration — run as ECS task

aws ecs run-task \
  --cluster psau-production \
  --task-definition psau-api-migrate \
  --launch-type FARGATE \
  --overrides '{"containerOverrides":[{"name":"psau-api","command":["node","dist/db/seed-production.js"]}]}'

# seed-production.js creates:
# - 1 system admin user (username: admin, temp password from Secrets Manager)
# - University metadata (name, logo path, academic year format)
# Does NOT create test data
```

### Step 6: Verify Deployment

```bash
# Health check
curl https://api.psau.edu.sd/health | jq .
# Expected:
# {
#   "status": "ok",
#   "services": {
#     "database": "connected",
#     "redis": "connected"
#   }
# }

# Verify API version
curl https://api.psau.edu.sd/health | jq .version

# Run smoke tests
pnpm test:smoke --env=production
```

### Step 7: Configure Monitoring (Post-Deploy)

```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name psau-production \
  --dashboard-body file://monitoring/cloudwatch-dashboard.json

# Configure alarms (done by Terraform, verify here)
aws cloudwatch describe-alarms \
  --alarm-name-prefix psau-production
# Should list: CPU, Memory, Error Rate, Response Time, DB Connections
```

### Step 8: DNS Cutover (Final Step)

```bash
# Point production domain to CloudFront + ALB
# In Route 53:
# psau.edu.sd          → CloudFront (web)
# api.psau.edu.sd      → ALB (API)
# www.psau.edu.sd      → Redirect to psau.edu.sd

# Verify TLS
curl -I https://psau.edu.sd | grep -E "HTTP|Strict-Transport"
curl -I https://api.psau.edu.sd/health | grep -E "HTTP|X-Frame"
```

---

## Zero-Downtime Database Migration Protocol

When a migration changes the schema in a way that affects running code:

```
STEP 1: Expand migration (backward compatible)
   - Add new columns with defaults or nullable
   - Add new tables
   - Old code still runs against new schema
   
STEP 2: Deploy new application code (reads new columns if present)

STEP 3: Contract migration (cleanup)
   - Remove old columns
   - Rename if needed
   - New code required before this runs

Example timeline:
Deploy 1: Migration adds column 'display_name' (nullable)
Deploy 2: Code uses 'display_name' if present
Deploy 3: Migration makes 'display_name' NOT NULL (data backfilled)
```

---

## Cost Estimate (Monthly — Production)

| Service | Config | Estimated Cost |
|---------|--------|---------------|
| ECS Fargate | 2 tasks × 1 vCPU × 2GB, ~720 hrs | ~$80 |
| RDS PostgreSQL | db.t4g.medium, Multi-AZ, 100GB | ~$120 |
| ElastiCache Redis | cache.t4g.medium | ~$50 |
| ALB | ~500GB data processed | ~$30 |
| CloudFront | ~100GB transfer/month | ~$10 |
| S3 (backups + web) | ~50GB | ~$5 |
| CloudWatch | Logs, metrics, alarms | ~$20 |
| Route 53 | Hosted zone + queries | ~$5 |
| **Total** | | **~$320/month** |

*Scale up ECS tasks during exam season — auto-scaling handles it*
