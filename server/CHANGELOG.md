# Changelog

## [1.1.0] - 2023-09-15

### Added
- Comprehensive validation schemas for all entity types (departments, students, receipts)
- Enhanced response handlers with standardized formatting
- Robust error classification and handling
- Improved database connection management
- Graceful server shutdown process

### Changed
- Updated validation rules to match database schema field lengths and constraints
- Improved database connection pool management
- Enhanced error handling with specific error codes
- Standardized API response formats with timestamps
- Updated README with comprehensive documentation

### Fixed
- Role validation now matches database values ('A' for Admin, 'U' for User)
- Fixed database connection handling to properly manage pool connections
- Improved error handling with proper status code classification
- Added missing validation for required fields in all schemas

## [1.0.0] - 2023-09-01

### Initial Release
- Basic CRUD operations for departments, students, and receipts
- User authentication with JWT
- Basic API routing
- Oracle database integration
- Initial test suite 