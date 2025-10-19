# Database Setup Guide

## Vercel Edge Config Setup

### 1. Create Edge Config in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to the "Storage" tab
3. Click "Create Database" → "Edge Config"
4. Copy the connection string and token

### 2. Environment Variables

Add these to your `.env.local` file:

```bash
# Edge Config
EDGE_CONFIG_TOKEN=your_edge_config_token_here
EDGE_CONFIG_URL=your_edge_config_url_here

# Security
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Admin Configuration
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_secure_admin_password
```

### 3. Database Schema

The database uses the following key structure:

```
user:{userId} -> User object
user:email:{email} -> userId
quiz:{quizId} -> Quiz object
quiz:all -> [quizId1, quizId2, ...]
quiz:by:{teacherId} -> [quizId1, quizId2, ...]
submission:{submissionId} -> QuizSubmission object
submission:quiz:{quizId} -> [submissionId1, submissionId2, ...]
submission:student:{studentId} -> [submissionId1, submissionId2, ...]
attempt:{attemptId} -> QuizAttempt object
attempt:quiz:{quizId} -> [attemptId1, attemptId2, ...]
attempt:student:{studentId} -> [attemptId1, attemptId2, ...]
```

### 4. Security Features

- **Authentication**: JWT-based with role-based access control
- **Rate Limiting**: Configurable per endpoint
- **Input Validation**: All inputs are sanitized and validated
- **CSRF Protection**: Token-based CSRF protection
- **Audit Logging**: All security events are logged
- **Data Encryption**: Sensitive data is encrypted at rest

### 5. User Roles

- **Student**: Can take quizzes, view own results
- **Teacher**: Can create quizzes, view all submissions
- **Admin**: Full access to all features

### 6. API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile

#### Quizzes
- `GET /api/quizzes` - Get all active quizzes
- `POST /api/quizzes` - Create quiz (teacher/admin only)
- `GET /api/quizzes/{id}` - Get specific quiz
- `PUT /api/quizzes/{id}` - Update quiz (teacher/admin only)
- `DELETE /api/quizzes/{id}` - Delete quiz (admin only)

#### Submissions
- `GET /api/submissions` - Get all submissions (teacher/admin only)
- `POST /api/submissions` - Submit quiz (student only)
- `GET /api/submissions/student` - Get student's submissions
- `GET /api/submissions/quiz/{id}` - Get quiz submissions (teacher/admin only)

### 7. Performance Considerations

- **Edge Config**: Global edge caching for fast reads
- **Indexing**: Proper indexing for efficient queries
- **Pagination**: Large datasets are paginated
- **Caching**: Frequently accessed data is cached
- **Rate Limiting**: Prevents abuse and ensures fair usage

### 8. Monitoring and Logging

- All API calls are logged with timestamps
- Security events are tracked and logged
- Performance metrics are collected
- Error tracking and alerting

### 9. Backup and Recovery

- Regular automated backups
- Point-in-time recovery
- Data export capabilities
- Disaster recovery procedures

### 10. Development vs Production

#### Development
- Uses localStorage for development
- Mock authentication
- Simplified security

#### Production
- Vercel Edge Config
- Full authentication
- Complete security measures
- Rate limiting enabled
- Audit logging active
