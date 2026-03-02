# CI/CD Pipeline
## GitHub Actions — Every Stage Documented

---

## Pipeline Overview

```
Push/PR → Lint & Type Check → Unit Tests → Integration Tests → 
Build → E2E Tests → Security Scan → [main only] → Deploy
```

| Trigger | Pipeline |
|---------|---------|
| PR to `develop` | Lint, type check, unit tests, integration tests, E2E |
| Push to `develop` | + Build images (no deploy) |
| Push to `main` | + Deploy to prod (AWS) |
| Schedule (nightly) | Full test suite + security scan + load test |
| Manual | Any environment deploy |

---

## File: `.github/workflows/ci.yml`

```yaml
name: CI Pipeline

on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop, main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true   # Cancel superseded runs on same branch

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'
  REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com

jobs:
  # ============================================================
  # JOB 1: Lint and Type Check (fast fail — 2-3 minutes)
  # ============================================================
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint (ESLint)
        run: pnpm lint
        # ESLint is configured to fail on any warning (--max-warnings 0)

      - name: Type check (shared)
        run: pnpm --filter @psau/shared type-check

      - name: Type check (api)
        run: pnpm --filter @psau/api type-check

      - name: Type check (web)
        run: pnpm --filter @psau/web type-check

      - name: Check for console.log in source
        run: |
          if grep -r "console\." packages/api/src packages/shared/src packages/web/src \
             --include="*.ts" --include="*.tsx" \
             | grep -v "// eslint-disable\|// ALLOWED" | grep -v "test\|spec"; then
            echo "❌ console.* found in source code. Use logger instead."
            exit 1
          fi

      - name: Check for hardcoded secrets
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  # ============================================================
  # JOB 2: GPA Formula Tests (MUST PASS BEFORE ANYTHING ELSE)
  # ============================================================
  gpa-formula-tests:
    name: GPA Formula Verification (Academic Law)
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: "${{ env.PNPM_VERSION }}" }
      - uses: actions/setup-node@v4
        with: { node-version: "${{ env.NODE_VERSION }}", cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - name: Build shared package
        run: pnpm --filter @psau/shared build
      - name: Run GPA formula tests
        run: pnpm --filter @psau/shared test --run src/lib/__tests__/gpa.test.ts
      - name: Fail with clear message on GPA test failure
        if: failure()
        run: |
          echo "❌ CRITICAL: GPA formula tests failed."
          echo "   The academic calculation formulas are incorrect."
          echo "   No other tests will run. This MUST be fixed first."
          echo "   Reference: Advising Guide 2019/2020 pages 33-43."
          exit 1

  # ============================================================
  # JOB 3: Unit Tests — All Packages
  # ============================================================
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, gpa-formula-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: "${{ env.PNPM_VERSION }}" }
      - uses: actions/setup-node@v4
        with: { node-version: "${{ env.NODE_VERSION }}", cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile

      - name: Build shared (required by api and web)
        run: pnpm --filter @psau/shared build

      - name: Unit tests — shared
        run: pnpm --filter @psau/shared test:coverage

      - name: Unit tests — api
        run: pnpm --filter @psau/api test:coverage

      - name: Unit tests — web
        run: pnpm --filter @psau/web test:coverage

      - name: Check coverage thresholds
        run: |
          # Coverage thresholds enforced by vitest config — build fails if below
          # This step just uploads the reports
          echo "Coverage thresholds enforced by vitest config"

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: |
            packages/shared/coverage/lcov.info
            packages/api/coverage/lcov.info
            packages/web/coverage/lcov.info
          flags: unit-tests
          fail_ci_if_error: true

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: unit-test-results
          path: '**/test-results/junit.xml'

  # ============================================================
  # JOB 4: Integration Tests (Docker-based)
  # ============================================================
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build API image for tests
        run: |
          docker build \
            --file docker/Dockerfile.api \
            --target build-api \
            --tag psau-api-test:ci \
            .

      - name: Start test services
        run: |
          docker compose -f docker/docker-compose.test.yml up \
            postgres redis -d

      - name: Wait for services
        run: |
          # Wait up to 60s for postgres
          for i in $(seq 1 12); do
            if docker exec psau-postgres-test pg_isready -U psau_test; then
              echo "Postgres ready"
              break
            fi
            echo "Waiting for postgres... ($i/12)"
            sleep 5
          done

      - name: Run migrations
        run: |
          docker run --rm \
            --network psau-test \
            -e DATABASE_URL=postgresql://psau_test:psau_test_password@postgres:5432/psau_test \
            -e NODE_ENV=test \
            psau-api-test:ci \
            pnpm --filter @psau/api db:migrate

      - name: Run integration tests
        run: |
          docker run --rm \
            --network psau-test \
            -e DATABASE_URL=postgresql://psau_test:psau_test_password@postgres:5432/psau_test \
            -e REDIS_URL=redis://redis:6379 \
            -e REDIS_ENABLED=true \
            -e NODE_ENV=test \
            -e JWT_SECRET=test-secret-at-least-32-characters-long-for-ci \
            -e JWT_REFRESH_SECRET=test-refresh-secret-at-least-32-chars-long \
            -e SEED_TEST_DATA=true \
            -e BYPASS_RATE_LIMIT=true \
            -e LOG_LEVEL=warn \
            psau-api-test:ci \
            pnpm --filter @psau/api test:integration

      - name: Stop test services
        if: always()
        run: docker compose -f docker/docker-compose.test.yml down -v

  # ============================================================
  # JOB 5: Build Docker Images
  # ============================================================
  build:
    name: Build & Push Images
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    if: github.event_name == 'push'   # Only on push, not PR
    permissions:
      id-token: write
      contents: read
    outputs:
      api-image: ${{ steps.meta-api.outputs.tags }}
      web-image: ${{ steps.meta-web.outputs.tags }}
      version: ${{ steps.version.outputs.version }}

    steps:
      - uses: actions/checkout@v4

      - name: Generate version
        id: version
        run: |
          VERSION="${{ github.ref_name }}-$(echo ${{ github.sha }} | head -c7)"
          echo "version=${VERSION}" >> $GITHUB_OUTPUT

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Extract API image metadata
        id: meta-api
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/psau-api
          tags: |
            type=sha,prefix={{branch}}-
            type=ref,event=branch
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

      - name: Build and push API image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/Dockerfile.api
          target: production
          push: true
          tags: ${{ steps.meta-api.outputs.tags }}
          labels: ${{ steps.meta-api.outputs.labels }}
          build-args: |
            APP_VERSION=${{ steps.version.outputs.version }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Extract Web image metadata
        id: meta-web
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/psau-web
          tags: |
            type=sha,prefix={{branch}}-
            type=ref,event=branch
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}

      - name: Build and push Web image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: docker/Dockerfile.web
          target: production
          push: true
          tags: ${{ steps.meta-web.outputs.tags }}
          labels: ${{ steps.meta-web.outputs.labels }}
          build-args: |
            VITE_API_URL=/api
            VITE_APP_VERSION=${{ steps.version.outputs.version }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ============================================================
  # JOB 6: E2E Tests
  # ============================================================
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Pull built images and start services
        env:
          API_IMAGE: ${{ needs.build.outputs.api-image }}
          WEB_IMAGE: ${{ needs.build.outputs.web-image }}
        run: |
          docker compose -f docker/docker-compose.test.yml up \
            postgres redis -d
          # Give services time to be ready
          sleep 20

      - name: Install Playwright
        run: npx playwright install chromium --with-deps

      - name: Run E2E tests
        run: pnpm --filter @psau/web test:e2e
        env:
          BASE_URL: http://localhost:8080
          CI: true

      - name: Upload E2E artifacts on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: packages/web/playwright-report/
          retention-days: 7

  # ============================================================
  # JOB 7: Security Scan
  # ============================================================
  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4

      - name: Dependency vulnerability audit
        run: |
          pnpm audit --audit-level=high
          # Fail on HIGH or CRITICAL vulnerabilities

      - name: Container image vulnerability scan (Trivy)
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ needs.build.outputs.api-image }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

  # ============================================================
  # JOB 8: Deploy to Production (main branch only)
  # ============================================================
  deploy-production:
    name: Deploy to Production (AWS)
    runs-on: ubuntu-latest
    needs: [build, e2e-tests, security-scan]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: production
      url: https://psau.edu.sd
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: '1.7.0'

      - name: Update ECS task definition — API
        id: update-api-task
        run: |
          # Get current task definition
          TASK_DEF=$(aws ecs describe-task-definition \
            --task-definition psau-api \
            --query taskDefinition)
          
          # Update image tag
          NEW_TASK_DEF=$(echo $TASK_DEF | jq \
            --arg IMAGE "${{ needs.build.outputs.api-image }}" \
            '.containerDefinitions[0].image = $IMAGE')
          
          # Register new task definition
          NEW_REVISION=$(aws ecs register-task-definition \
            --cli-input-json "$NEW_TASK_DEF" \
            --query 'taskDefinition.taskDefinitionArn' \
            --output text)
          
          echo "new-revision=${NEW_REVISION}" >> $GITHUB_OUTPUT

      - name: Deploy API to ECS (rolling update)
        run: |
          aws ecs update-service \
            --cluster psau-production \
            --service psau-api \
            --task-definition ${{ steps.update-api-task.outputs.new-revision }} \
            --deployment-configuration "minimumHealthyPercent=100,maximumPercent=200" \
            --force-new-deployment

      - name: Wait for API deployment to stabilize
        run: |
          aws ecs wait services-stable \
            --cluster psau-production \
            --services psau-api
          echo "✅ API deployment stable"

      - name: Deploy Web (S3 + CloudFront)
        run: |
          # Build web assets with prod config
          pnpm --filter @psau/web build
          
          # Sync to S3 (versioned assets with long cache)
          aws s3 sync packages/web/dist s3://${{ secrets.WEB_S3_BUCKET }} \
            --cache-control "public, max-age=31536000, immutable" \
            --exclude "index.html"
          
          # Upload index.html with no-cache (always fresh)
          aws s3 cp packages/web/dist/index.html \
            s3://${{ secrets.WEB_S3_BUCKET }}/index.html \
            --cache-control "no-cache, no-store, must-revalidate"
          
          # Invalidate CloudFront (force browsers to fetch new index.html)
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/index.html" "/"

      - name: Run smoke tests against production
        run: |
          sleep 30  # Give CloudFront time to propagate
          pnpm test:smoke --env=prod
        env:
          SMOKE_TEST_URL: https://psau.edu.sd

      - name: Notify deployment success
        if: success()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-type: application/json' \
            -d '{
              "text": "✅ PSAU v${{ needs.build.outputs.version }} deployed to production",
              "blocks": [{
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "✅ *PSAU Academic System* deployed\n• Version: `${{ needs.build.outputs.version }}`\n• URL: https://psau.edu.sd\n• Deploy time: ${{ github.run_number }}"
                }
              }]
            }'

      - name: Rollback on failure
        if: failure()
        run: |
          echo "❌ Deployment failed. Rolling back ECS to previous task definition."
          
          # Get previous task definition
          PREV_REVISION=$(aws ecs describe-services \
            --cluster psau-production \
            --services psau-api \
            --query 'services[0].deployments[1].taskDefinition' \
            --output text)
          
          aws ecs update-service \
            --cluster psau-production \
            --service psau-api \
            --task-definition $PREV_REVISION
          
          curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
            -H 'Content-type: application/json' \
            -d '{
              "text": "❌ PSAU deployment FAILED and rolled back. Check GitHub Actions for details."
            }'
```

---

## File: `.github/workflows/nightly.yml`

```yaml
name: Nightly Quality Gate

on:
  schedule:
    - cron: '0 2 * * *'   # 2am UTC every night
  workflow_dispatch:        # Allow manual trigger

jobs:
  full-test-suite:
    name: Full Test Suite + Security
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile

      - name: Build all packages
        run: pnpm build

      - name: Run all tests with coverage
        run: pnpm test:coverage

      - name: Run OWASP ZAP security scan
        run: |
          docker compose -f docker/docker-compose.test.yml up -d
          sleep 30
          docker run --rm \
            --network psau-test \
            -v $(pwd)/zap:/zap/wrk \
            owasp/zap2docker-stable zap-full-scan.py \
            -t http://api-test:8080 \
            -r zap-report.html \
            -l WARN

      - name: Run load test (k6)
        run: |
          docker run --rm \
            --network psau-test \
            -v $(pwd)/tests/load:/scripts \
            grafana/k6 run \
            --vus 100 \
            --duration 5m \
            /scripts/student-list.js

      - name: Full dependency audit
        run: pnpm audit --audit-level=moderate

      - name: Upload nightly reports
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: nightly-reports-${{ github.run_id }}
          path: |
            coverage/
            zap/zap-report.html
            test-results/
          retention-days: 30
```

---

## File: `.github/workflows/hotfix.yml`

```yaml
name: Hotfix Deploy

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Hotfix version (e.g. v2.1.1)'
        required: true
      confirm:
        description: 'Type DEPLOY to confirm production deploy'
        required: true

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Validate confirmation
        run: |
          if [ "${{ github.event.inputs.confirm }}" != "DEPLOY" ]; then
            echo "Confirmation string must be 'DEPLOY'"
            exit 1
          fi

  hotfix-deploy:
    needs: validate
    uses: ./.github/workflows/ci.yml  # Reuse full CI pipeline
    secrets: inherit
```
