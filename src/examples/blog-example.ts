import {
  IndexedDBUtil,
  type DatabaseConfig,
} from '@osiris-smarttv/indexeddb-util'

// Database configuration for a simple blog application
const blogConfig: DatabaseConfig = {
  name: 'BlogApp',
  version: 1,
  stores: [
    {
      name: 'users',
      config: { keyPath: 'id', autoIncrement: true },
      indices: [
        { name: 'email', keyPath: 'email', options: { unique: true } },
        { name: 'username', keyPath: 'username', options: { unique: true } },
        { name: 'role', keyPath: 'role' },
        { name: 'createdAt', keyPath: 'createdAt' },
      ],
      data: [
        {
          id: 1,
          username: 'admin',
          email: 'admin@blog.com',
          role: 'admin',
          createdAt: new Date('2024-01-01'),
          profile: { firstName: 'John', lastName: 'Admin' },
        },
        {
          id: 2,
          username: 'author1',
          email: 'author1@blog.com',
          role: 'author',
          createdAt: new Date('2024-01-15'),
          profile: { firstName: 'Jane', lastName: 'Writer' },
        },
      ],
    },
    {
      name: 'posts',
      config: { keyPath: 'id', autoIncrement: true },
      indices: [
        { name: 'authorId', keyPath: 'authorId' },
        { name: 'status', keyPath: 'status' },
        { name: 'category', keyPath: 'category' },
        { name: 'publishedAt', keyPath: 'publishedAt' },
        { name: 'authorStatus', keyPath: ['authorId', 'status'] }, // Compound index
      ],
    },
    {
      name: 'comments',
      config: { keyPath: 'id', autoIncrement: true },
      indices: [
        { name: 'postId', keyPath: 'postId' },
        { name: 'userId', keyPath: 'userId' },
        { name: 'status', keyPath: 'status' },
      ],
    },
  ],
}

// Example usage class
class BlogService {
  private db: IndexedDBUtil

  constructor() {
    this.db = new IndexedDBUtil(blogConfig)
  }

  async init(): Promise<void> {
    await this.db.init()
    console.log('Blog database initialized successfully!')
  }

  // User management
  async createUser(userData: any): Promise<void> {
    try {
      const users = await this.db.add('users', {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      console.log('User created successfully. Total users:', users.length)
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  async getUserByEmail(email: string): Promise<any> {
    try {
      // Use query with index for efficient lookup
      const users = await this.db.query('users', {
        index: 'email',
      })

      return users.find(user => user.email === email)
    } catch (error) {
      console.error('Error getting user by email:', error)
      return null
    }
  }

  async getUsersByRole(role: string): Promise<any[]> {
    try {
      return await this.db
        .query('users', {
          index: 'role',
        })
        .then(users => users.filter(user => user.role === role))
    } catch (error) {
      console.error('Error getting users by role:', error)
      return []
    }
  }

  // Post management
  async createPost(postData: any): Promise<number> {
    try {
      const postKey = await this.db.put('posts', {
        ...postData,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: postData.status || 'draft',
      })
      console.log('Post created with ID:', postKey)
      return postKey as number
    } catch (error) {
      console.error('Error creating post:', error)
      throw error
    }
  }

  async getPostsByAuthor(authorId: number, status?: string): Promise<any[]> {
    try {
      if (status) {
        // Use compound index for efficient filtering
        return await this.db
          .query('posts', {
            index: 'authorStatus',
          })
          .then(posts =>
            posts.filter(
              post => post.authorId === authorId && post.status === status
            )
          )
      } else {
        return await this.db
          .query('posts', {
            index: 'authorId',
          })
          .then(posts => posts.filter(post => post.authorId === authorId))
      }
    } catch (error) {
      console.error('Error getting posts by author:', error)
      return []
    }
  }

  async getPublishedPosts(limit = 10, offset = 0): Promise<any[]> {
    try {
      return await this.db
        .query('posts', {
          index: 'status',
          limit,
          offset,
          direction: 'prev', // Latest first
        })
        .then(posts => posts.filter(post => post.status === 'published'))
    } catch (error) {
      console.error('Error getting published posts:', error)
      return []
    }
  }

  async publishPost(postId: number): Promise<void> {
    try {
      const post = await this.db.get('posts', postId)
      if (!post) {
        throw new Error('Post not found')
      }

      await this.db.update('posts', 'id', postId, {
        ...post,
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      console.log('Post published successfully')
    } catch (error) {
      console.error('Error publishing post:', error)
      throw error
    }
  }

  // Comment management
  async addComment(commentData: any): Promise<void> {
    try {
      await this.db.add('comments', {
        ...commentData,
        createdAt: new Date(),
        status: 'approved',
      })
      console.log('Comment added successfully')
    } catch (error) {
      console.error('Error adding comment:', error)
      throw error
    }
  }

  async getCommentsByPost(postId: number): Promise<any[]> {
    try {
      return await this.db
        .query('comments', {
          index: 'postId',
        })
        .then(comments =>
          comments.filter(
            comment =>
              comment.postId === postId && comment.status === 'approved'
          )
        )
    } catch (error) {
      console.error('Error getting comments:', error)
      return []
    }
  }

  // Analytics and reporting
  async getStats(): Promise<any> {
    try {
      const [userCount, postCount, commentCount] = await Promise.all([
        this.db.count('users'),
        this.db.count('posts'),
        this.db.count('comments'),
      ])

      const publishedPosts = await this.db
        .query('posts', {
          index: 'status',
        })
        .then(posts => posts.filter(post => post.status === 'published'))

      return {
        totalUsers: userCount,
        totalPosts: postCount,
        publishedPosts: publishedPosts.length,
        totalComments: commentCount,
      }
    } catch (error) {
      console.error('Error getting stats:', error)
      return null
    }
  }

  // Bulk operations
  async importPosts(posts: any[]): Promise<void> {
    try {
      const processedPosts = posts.map(post => ({
        ...post,
        createdAt: new Date(post.createdAt || Date.now()),
        updatedAt: new Date(),
        status: post.status || 'draft',
      }))

      const keys = await this.db.bulkAdd('posts', processedPosts)
      console.log(`Successfully imported ${keys.length} posts`)
    } catch (error) {
      console.error('Error importing posts:', error)
      throw error
    }
  }

  // Advanced queries with key ranges
  async getPostsInDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // Using key range for efficient date range queries
      return await this.db
        .query('posts', {
          index: 'publishedAt',
        })
        .then(posts =>
          posts.filter(post => {
            const publishedAt = new Date(post.publishedAt)
            return publishedAt >= startDate && publishedAt <= endDate
          })
        )
    } catch (error) {
      console.error('Error getting posts in date range:', error)
      return []
    }
  }

  // Database maintenance
  async clearDrafts(): Promise<void> {
    try {
      // Get all draft posts
      const drafts = await this.db
        .query('posts', {
          index: 'status',
        })
        .then(posts => posts.filter(post => post.status === 'draft'))

      // Delete each draft
      for (const draft of drafts) {
        await this.db.delete('posts', draft.id)
      }

      console.log(`Cleared ${drafts.length} draft posts`)
    } catch (error) {
      console.error('Error clearing drafts:', error)
      throw error
    }
  }

  async close(): Promise<void> {
    this.db.close()
    console.log('Database connection closed')
  }
}

// Example usage
async function runExample(): Promise<void> {
  const blogService = new BlogService()

  try {
    // Initialize database
    await blogService.init()

    // Get initial stats
    console.log('Initial stats:', await blogService.getStats())

    // Create a new user
    await blogService.createUser({
      username: 'newauthor',
      email: 'newauthor@blog.com',
      role: 'author',
      profile: { firstName: 'New', lastName: 'Author' },
    })

    // Create some posts
    const postId1 = await blogService.createPost({
      title: 'My First Post',
      content: 'This is the content of my first post',
      authorId: 2,
      category: 'Technology',
    })

    await blogService.createPost({
      title: 'Another Post',
      content: 'Content for another post',
      authorId: 2,
      category: 'Lifestyle',
    })

    // Publish a post
    await blogService.publishPost(postId1)

    // Add comments
    await blogService.addComment({
      postId: postId1,
      userId: 1,
      content: 'Great post!',
      authorName: 'Admin',
    })

    // Get posts by author
    const authorPosts = await blogService.getPostsByAuthor(2)
    console.log('Posts by author 2:', authorPosts)

    // Get published posts
    const publishedPosts = await blogService.getPublishedPosts(5)
    console.log('Published posts:', publishedPosts)

    // Get comments for a post
    const comments = await blogService.getCommentsByPost(postId1)
    console.log('Comments for post:', comments)

    // Get final stats
    console.log('Final stats:', await blogService.getStats())

    // Get users by role
    const authors = await blogService.getUsersByRole('author')
    console.log('Authors:', authors)

    // Get posts in date range (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentPosts = await blogService.getPostsInDateRange(
      thirtyDaysAgo,
      new Date()
    )
    console.log('Recent posts:', recentPosts)
  } catch (error) {
    console.error('Example failed:', error)
  } finally {
    await blogService.close()
  }
}

// Run the example (uncomment to execute)
// runExample()

export { BlogService, blogConfig, runExample }
