// Database types and schema
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  createdAt: string;
  lastLoginAt?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  timeLimitSeconds?: number;
  questions: MCQQuestion[];
  createdBy: string; // User ID
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface MCQQuestion {
  text: string;
  options: string[];
  correctIndex: number;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  studentId: string;
  studentName: string;
  selectedIndices: number[];
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  startedAt: string;
  submittedAt: string;
  timeSpent: number; // in seconds
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  attemptNumber: number;
  startedAt: string;
  submittedAt?: string;
  score?: number;
  isCompleted: boolean;
}

// Database operations using Edge Config
export class Database {
  private static instance: Database;
  
  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  // Users
  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const id = crypto.randomUUID();
    const newUser: User = {
      ...user,
      id,
      createdAt: new Date().toISOString(),
    };
    
    // Store in Edge Config
    await this.setEdgeConfig(`user:${id}`, newUser);
    await this.setEdgeConfig(`user:email:${user.email}`, id);
    
    return newUser;
  }

  async getUserById(id: string): Promise<User | null> {
    return await this.getEdgeConfig(`user:${id}`);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const userId = await this.getEdgeConfig<string>(`user:email:${email}`);
    if (!userId) return null;
    return await this.getUserById(userId);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const user = await this.getUserById(id);
    if (!user) return null;
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date().toISOString() };
    await this.setEdgeConfig(`user:${id}`, updatedUser);
    return updatedUser;
  }

  // Quizzes
  async createQuiz(quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>): Promise<Quiz> {
    const id = crypto.randomUUID();
    const newQuiz: Quiz = {
      ...quiz,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await this.setEdgeConfig(`quiz:${id}`, newQuiz);
    await this.addToIndex(`quizzes:all`, id);
    await this.addToIndex(`quizzes:by:${quiz.createdBy}`, id);
    
    return newQuiz;
  }

  async getQuizById(id: string): Promise<Quiz | null> {
    return await this.getEdgeConfig(`quiz:${id}`);
  }

  async getAllQuizzes(): Promise<Quiz[]> {
    const quizIds = await this.getEdgeConfig<string[]>(`quizzes:all`) || [];
    const quizzes = await Promise.all(
      quizIds.map(id => this.getQuizById(id))
    );
    return quizzes.filter(quiz => quiz !== null) as Quiz[];
  }

  async getQuizzesByTeacher(teacherId: string): Promise<Quiz[]> {
    const quizIds = await this.getEdgeConfig<string[]>(`quizzes:by:${teacherId}`) || [];
    const quizzes = await Promise.all(
      quizIds.map(id => this.getQuizById(id))
    );
    return quizzes.filter(quiz => quiz !== null) as Quiz[];
  }

  async updateQuiz(id: string, updates: Partial<Quiz>): Promise<Quiz | null> {
    const quiz = await this.getQuizById(id);
    if (!quiz) return null;
    
    const updatedQuiz = { ...quiz, ...updates, updatedAt: new Date().toISOString() };
    await this.setEdgeConfig(`quiz:${id}`, updatedQuiz);
    return updatedQuiz;
  }

  async deleteQuiz(id: string): Promise<boolean> {
    const quiz = await this.getQuizById(id);
    if (!quiz) return false;
    
    await this.deleteEdgeConfig(`quiz:${id}`);
    await this.removeFromIndex(`quizzes:all`, id);
    await this.removeFromIndex(`quizzes:by:${quiz.createdBy}`, id);
    
    return true;
  }

  // Quiz Submissions
  async createSubmission(submission: Omit<QuizSubmission, 'id'>): Promise<QuizSubmission> {
    const id = crypto.randomUUID();
    const newSubmission: QuizSubmission = {
      ...submission,
      id,
    };
    
    await this.setEdgeConfig(`submission:${id}`, newSubmission);
    await this.addToIndex(`submissions:quiz:${submission.quizId}`, id);
    await this.addToIndex(`submissions:student:${submission.studentId}`, id);
    
    return newSubmission;
  }

  async getSubmissionById(id: string): Promise<QuizSubmission | null> {
    return await this.getEdgeConfig(`submission:${id}`);
  }

  async getSubmissionsByStudent(studentId: string): Promise<QuizSubmission[]> {
    const submissionIds = await this.getEdgeConfig<string[]>(`submissions:student:${studentId}`) || [];
    const submissions = await Promise.all(
      submissionIds.map(id => this.getSubmissionById(id))
    );
    return submissions.filter(submission => submission !== null) as QuizSubmission[];
  }

  async getSubmissionsByQuiz(quizId: string): Promise<QuizSubmission[]> {
    const submissionIds = await this.getEdgeConfig<string[]>(`submissions:quiz:${quizId}`) || [];
    const submissions = await Promise.all(
      submissionIds.map(id => this.getSubmissionById(id))
    );
    return submissions.filter(submission => submission !== null) as QuizSubmission[];
  }

  async getAllSubmissions(): Promise<QuizSubmission[]> {
    // This is a simplified implementation
    // In production, you'd want to maintain a global submissions index
    const allKeys = await this.getEdgeConfig<string[]>('_all_keys') || [];
    const submissionKeys = allKeys.filter((key: string) => key.startsWith('submission:'));
    const submissions = await Promise.all(
      submissionKeys.map(key => this.getEdgeConfig<QuizSubmission>(key))
    );
    return submissions.filter(submission => submission !== null) as QuizSubmission[];
  }

  // Quiz Attempts
  async createAttempt(attempt: Omit<QuizAttempt, 'id'>): Promise<QuizAttempt> {
    const id = crypto.randomUUID();
    const newAttempt: QuizAttempt = {
      ...attempt,
      id,
    };
    
    await this.setEdgeConfig(`attempt:${id}`, newAttempt);
    await this.addToIndex(`attempts:quiz:${attempt.quizId}`, id);
    await this.addToIndex(`attempts:student:${attempt.studentId}`, id);
    
    return newAttempt;
  }

  async getAttemptById(id: string): Promise<QuizAttempt | null> {
    return await this.getEdgeConfig(`attempt:${id}`);
  }

  async getAttemptsByStudent(studentId: string): Promise<QuizAttempt[]> {
    const attemptIds = await this.getEdgeConfig<string[]>(`attempts:student:${studentId}`) || [];
    const attempts = await Promise.all(
      attemptIds.map(id => this.getAttemptById(id))
    );
    return attempts.filter(attempt => attempt !== null) as QuizAttempt[];
  }

  async getAttemptsByQuiz(quizId: string): Promise<QuizAttempt[]> {
    const attemptIds = await this.getEdgeConfig<string[]>(`attempts:quiz:${quizId}`) || [];
    const attempts = await Promise.all(
      attemptIds.map(id => this.getAttemptById(id))
    );
    return attempts.filter(attempt => attempt !== null) as QuizAttempt[];
  }

  // Helper methods for Edge Config
  private async setEdgeConfig(key: string, value: unknown): Promise<void> {
    // In production, this would use Vercel Edge Config
    // For now, we'll use a simple in-memory store for development
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  private async getEdgeConfig<T = unknown>(key: string): Promise<T | null> {
    if (typeof window !== 'undefined') {
      const value = localStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : null;
    }
    return null;
  }

  private async deleteEdgeConfig(key: string): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }

  private async addToIndex(indexKey: string, value: string): Promise<void> {
    const index = (await this.getEdgeConfig<string[]>(indexKey)) || [];
    if (!index.includes(value)) {
      index.push(value);
      await this.setEdgeConfig(indexKey, index);
    }
  }

  private async removeFromIndex(indexKey: string, value: string): Promise<void> {
    const index = (await this.getEdgeConfig<string[]>(indexKey)) || [];
    const newIndex = index.filter((item) => item !== value);
    await this.setEdgeConfig(indexKey, newIndex);
  }
}

// Export singleton instance
export const db = Database.getInstance();
