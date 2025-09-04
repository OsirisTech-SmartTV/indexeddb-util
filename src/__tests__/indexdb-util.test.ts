import 'fake-indexeddb/auto'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FDBFactory = require('fake-indexeddb/lib/FDBFactory')
import {
  IndexedDBUtil,
  createDB,
  openDB,
  isIndexedDBSupported,
  getBrowserCompatibility,
  KeyRange,
  type DatabaseConfig,
  type IDBStoreConfig,
} from '../index'

describe('IndexedDB Utility', () => {
  beforeEach(() => {
    // Reset IndexedDB state before each test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(global as any).indexedDB = new FDBFactory()
  })

  describe('Compatibility checks', () => {
    test('should detect IndexedDB support', () => {
      expect(isIndexedDBSupported()).toBe(true)
    })

    test('should return browser compatibility info', () => {
      const compatibility = getBrowserCompatibility()
      expect(compatibility.supported).toBe(true)
      expect(compatibility.features).toMatchObject({
        transactions: true,
        cursors: true,
        keyRange: true,
        multiEntry: true,
        compound: true,
      })
    })
  })

  describe('KeyRange utilities', () => {
    test('should create key ranges correctly', () => {
      expect(KeyRange.only('test')).toBeDefined()
      expect(KeyRange.lowerBound(1)).toBeDefined()
      expect(KeyRange.upperBound(10)).toBeDefined()
      expect(KeyRange.bound(1, 10)).toBeDefined()
    })
  })

  describe('Low-level functions', () => {
    const dbName = 'test-db'
    const dbVersion = 1
    const stores: IDBStoreConfig[] = [
      {
        name: 'users',
        config: { keyPath: 'id', autoIncrement: true },
        indices: [
          { name: 'email', keyPath: 'email', options: { unique: true } },
          { name: 'age', keyPath: 'age' },
        ],
        data: [
          { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 },
        ],
      },
      {
        name: 'products',
        config: { keyPath: 'id', autoIncrement: true },
      },
    ]

    test('should create database with stores and initial data', async () => {
      const db = await createDB(dbName, dbVersion, stores)

      expect(db.name).toBe(dbName)
      expect(db.version).toBe(dbVersion)
      expect(db.objectStoreNames.contains('users')).toBe(true)
      expect(db.objectStoreNames.contains('products')).toBe(true)

      db.close()
    })

    test('should open existing database', async () => {
      // First create the database
      const db1 = await createDB(dbName, dbVersion, stores)
      db1.close()

      // Then open it
      const db2 = await openDB(dbName, dbVersion)
      expect(db2.name).toBe(dbName)
      expect(db2.version).toBe(dbVersion)

      db2.close()
    })
  })

  describe('IndexedDBUtil class', () => {
    let dbUtil: IndexedDBUtil
    const config: DatabaseConfig = {
      name: 'class-test-db',
      version: 1,
      stores: [
        {
          name: 'users',
          config: { keyPath: 'id', autoIncrement: true },
          indices: [
            { name: 'email', keyPath: 'email', options: { unique: true } },
            { name: 'name', keyPath: 'name' },
          ],
        },
        {
          name: 'posts',
          config: { keyPath: 'id', autoIncrement: true },
          indices: [
            { name: 'userId', keyPath: 'userId' },
            { name: 'title', keyPath: 'title' },
          ],
        },
      ],
    }

    beforeEach(async () => {
      dbUtil = new IndexedDBUtil(config)
      await dbUtil.init()
    })

    afterEach(() => {
      dbUtil.close()
    })

    test('should initialize database correctly', () => {
      const db = dbUtil.getDB()
      expect(db.name).toBe(config.name)
      expect(db.version).toBe(config.version)
      expect(db.objectStoreNames.contains('users')).toBe(true)
      expect(db.objectStoreNames.contains('posts')).toBe(true)
    })

    test('should perform CRUD operations', async () => {
      // Add data
      const userData = { name: 'Test User', email: 'test@example.com', age: 28 }
      await dbUtil.add('users', userData)

      // Get all data
      const allUsers = await dbUtil.getAll('users')
      expect(allUsers).toHaveLength(1)
      expect(allUsers[0]).toMatchObject(userData)

      // Get by key (the first auto-generated key should be 1)
      const user = await dbUtil.get('users', allUsers[0].id)
      expect(user).toMatchObject(userData)

      // Update data using put instead of update for auto-generated keys
      const updatedData = { ...allUsers[0], age: 29 }
      await dbUtil.put('users', updatedData)

      const updatedUser = await dbUtil.get('users', allUsers[0].id)
      expect(updatedUser?.age).toBe(29)

      // Delete data
      const [deletedUser, remainingUsers] = await dbUtil.delete(
        'users',
        allUsers[0].id
      )
      expect(deletedUser?.age).toBe(29)
      expect(remainingUsers).toHaveLength(0)
    }, 10000)

    test('should perform bulk operations', async () => {
      // Clear any existing data first
      await dbUtil.clear('users')

      const usersData = [
        { name: 'User 1', email: 'user1@example.com', age: 25 },
        { name: 'User 2', email: 'user2@example.com', age: 30 },
        { name: 'User 3', email: 'user3@example.com', age: 35 },
      ]

      // Bulk add
      const keys = await dbUtil.bulkAdd('users', usersData)
      expect(keys).toHaveLength(3)

      // Count
      const count = await dbUtil.count('users')
      expect(count).toBe(3)

      // Query with options
      const allUsers = await dbUtil.query('users', {
        limit: 2,
      })
      expect(allUsers).toHaveLength(2)

      // Clear store
      await dbUtil.clear('users')
      const countAfterClear = await dbUtil.count('users')
      expect(countAfterClear).toBe(0)
    })

    test('should handle transactions correctly', async () => {
      const tx = dbUtil.transaction(['users', 'posts'], 'readwrite')

      const usersStore = await tx.getStore('users')
      const postsStore = await tx.getStore('posts')

      expect(usersStore.name).toBe('users')
      expect(postsStore.name).toBe('posts')

      await tx.commit()
    })

    test('should handle errors gracefully', async () => {
      // Test getting non-existent data
      const nonExistent = await dbUtil.get('users', 999)
      expect(nonExistent).toBeUndefined()

      // Test updating non-existent data
      await expect(
        dbUtil.update('users', 'id', 999, { name: 'Test' })
      ).rejects.toThrow()

      // Test deleting non-existent data
      await expect(dbUtil.delete('users', 999)).rejects.toThrow()
    })
  })

  describe('Static methods', () => {
    test('should delete database', async () => {
      const dbName = 'delete-test-db'

      // Create database
      const db = await createDB(dbName, 1, [])
      db.close()

      // Delete database
      await IndexedDBUtil.deleteDatabase(dbName)

      // Try to open - should work (create new one)
      const newDb = await openDB(dbName, 1)
      expect(newDb.name).toBe(dbName)
      newDb.close()
    })
  })
})
