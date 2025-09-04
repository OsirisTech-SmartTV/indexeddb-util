# @osiris-smarttv/indexeddb-util

A TypeScript utility library for working with IndexedDB easily and efficiently. Designed for modern browsers including Chrome >= 53, with comprehensive support for Smart TV platforms.

## ✨ Features

- � **Easy to use**: Simple API with both low-level functions and high-level class wrapper
- 🔥 **TypeScript**: Full TypeScript support with comprehensive type definitions
- 🌐 **Cross-browser**: Supports Chrome >= 53, Firefox >= 78, Safari >= 13, Edge >= 79
- 📱 **Smart TV Ready**: Optimized for Smart TV platforms (Samsung Tizen, LG webOS, etc.)
- 🛡️ **Error Handling**: Comprehensive error handling with custom error types
- ⚡ **Performance**: Memory-efficient operations with bulk operations support
- 🔍 **Advanced Querying**: Support for indices, cursors, and key ranges
- 🧪 **Well Tested**: Comprehensive test suite included

## 📦 Installation

```bash
npm install @osiris-smarttv/indexeddb-util
```

## 🚀 Quick Start

### Using the IndexedDBUtil Class (Recommended)

```typescript
import {
  IndexedDBUtil,
  type DatabaseConfig,
} from '@osiris-smarttv/indexeddb-util'

// Define your database configuration
const config: DatabaseConfig = {
  name: 'MyAppDB',
  version: 1,
  stores: [
    {
      name: 'users',
      config: { keyPath: 'id', autoIncrement: true },
      indices: [
        { name: 'email', keyPath: 'email', options: { unique: true } },
        { name: 'name', keyPath: 'name' },
      ],
      data: [
        { id: 1, name: 'Osiris Team', email: 'team@osiris.com', age: 30 },
        {
          id: 2,
          name: 'Thành Công',
          email: 'thanhcongns94@gmail.com',
          age: 25,
        },
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

// Initialize the database
const dbUtil = new IndexedDBUtil(config)
await dbUtil.init()

// Perform operations
const users = await dbUtil.getAll('users')
console.log('All users:', users)

// Add new user
const newUser = { name: 'Bob Wilson', email: 'bob@example.com', age: 28 }
await dbUtil.add('users', newUser)

// Get user by ID
const user = await dbUtil.get('users', 1)
console.log('User:', user)

// Update user
await dbUtil.update('users', 'id', 1, { ...user, age: 31 })

// Delete user
await dbUtil.delete('users', 1)

// Close connection
dbUtil.close()
```

### Using Low-Level Functions

```typescript
import {
  createDB,
  transaction,
  getObjectData,
  addObjectData,
} from '@osiris-smarttv/indexeddb-util'

// Create database
const db = await createDB('MyDB', 1, [
  {
    name: 'users',
    config: { keyPath: 'id', autoIncrement: true },
  },
])

// Create transaction
const tx = transaction(db, 'users', 'readwrite')
const store = await tx.getStore('users')

// Add data
await addObjectData(store, { name: 'John', email: 'john@example.com' })

// Get data
const user = await getObjectData(store, 1)
console.log(user)

db.close()
```

## 🎨 Live Demo

Experience the library in action with our interactive demo:

### 🌐 **[View Live Demo](https://osiristech-smarttv.github.io/indexeddb-util/)**

The demo showcases all features of the library including:

- ✅ **Browser Compatibility Check** - Automatic IndexedDB support detection
- 🗃️ **Database Management** - Initialize, delete, and inspect databases
- 👥 **User Management** - Complete CRUD operations with form validation
- 📝 **Post Management** - Content management with categories and statuses
- 🔍 **Advanced Querying** - Index-based searches, limits, and filters
- ⚡ **Performance Testing** - Bulk operations and timing measurements
- 📊 **Real-time Statistics** - Live dashboard with counts and metrics
- 🌐 **Chrome >= 53 Compatible** - Works on older browsers and Smart TVs

**Features:**

- Interactive forms for data entry
- Real-time error handling and validation
- Visual feedback for all operations
- Clean, responsive interface
- Compatible with Smart TV browsers

## 📖 API Reference

### IndexedDBUtil Class

#### Constructor

```typescript
const dbUtil = new IndexedDBUtil(config: DatabaseConfig)
```

#### Methods

- `init(): Promise<void>` - Initialize the database
- `getDB(): IDBDatabase` - Get the database instance
- `transaction(stores, mode): TransactionHandler` - Create a transaction
- `get<T>(storeName, key): Promise<T | undefined>` - Get object by key
- `getAll<T>(storeName): Promise<T[]>` - Get all objects
- `query<T>(storeName, options): Promise<T[]>` - Query with options
- `count(storeName, keyRange?): Promise<number>` - Count objects
- `add<T>(storeName, data): Promise<T[]>` - Add object
- `put<T>(storeName, data): Promise<IDBValidKey>` - Put object
- `bulkAdd<T>(storeName, dataArray): Promise<IDBValidKey[]>` - Add multiple objects
- `update<T>(storeName, keyPath, key, newData): Promise<T[]>` - Update object
- `delete<T>(storeName, key): Promise<[T | undefined, T[]]>` - Delete object
- `clear(storeName): Promise<void>` - Clear store
- `close(): void` - Close database

#### Static Methods

- `IndexedDBUtil.deleteDatabase(name): Promise<void>` - Delete entire database

### Low-Level Functions

```typescript
// Database operations
createDB(name: string, version: number, stores?: IDBStoreConfig[]): Promise<IDBDatabase>
openDB(name: string, version: number): Promise<IDBDatabase>

// Transaction operations
transaction(db: IDBDatabase, stores: string | string[], mode: IDBTransactionMode): TransactionHandler

// CRUD operations
getObjectData<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T | undefined>
getAllObjectData<T>(store: IDBObjectStore): Promise<T[]>
queryObjectData<T>(store: IDBObjectStore, options: QueryOptions): Promise<T[]>
countObjectData(store: IDBObjectStore, keyRange?: IDBKeyRange): Promise<number>
addObjectData<T>(store: IDBObjectStore, data: T): Promise<T[]>
putObjectData<T>(store: IDBObjectStore, data: T): Promise<IDBValidKey>
bulkAddObjectData<T>(store: IDBObjectStore, dataArray: T[]): Promise<IDBValidKey[]>
updateObjectData<T>(store: IDBObjectStore, keyPath: string, key: string | number, newData: T): Promise<T[]>
deleteObjectData<T>(store: IDBObjectStore, key: IDBValidKey): Promise<[T | undefined, T[]]>
clearObjectStore(store: IDBObjectStore): Promise<void>

// Utility functions
isIndexedDBSupported(): boolean
getBrowserCompatibility(): { supported: boolean; features: object }
```

### Types

```typescript
interface DatabaseConfig {
  name: string
  version: number
  stores: IDBStoreConfig[]
}

interface IDBStoreConfig {
  name: string
  config: IDBObjectStoreParameters
  indices?: IDBIndexConfig[]
  data?: Array<{ id: string | number; [key: string]: any }>
}

interface IDBIndexConfig {
  name: string
  keyPath: string | string[]
  options?: IDBIndexParameters
}

interface QueryOptions {
  index?: string
  direction?: IDBCursorDirection
  limit?: number
  offset?: number
}
```

### Key Range Utilities

```typescript
import { KeyRange } from '@osiris-smarttv/indexeddb-util'

// Create key ranges
const exactMatch = KeyRange.only('value')
const lowerBound = KeyRange.lowerBound(10, false) // >= 10
const upperBound = KeyRange.upperBound(100, true) // < 100
const range = KeyRange.bound(10, 100, false, true) // >= 10 && < 100

// Use with queries
const results = await dbUtil.query('users', {
  index: 'age',
  keyRange: KeyRange.bound(18, 65),
})
```

## 🌟 Advanced Usage

### Working with Indices

```typescript
const config: DatabaseConfig = {
  name: 'AdvancedDB',
  version: 1,
  stores: [
    {
      name: 'products',
      config: { keyPath: 'id', autoIncrement: true },
      indices: [
        { name: 'category', keyPath: 'category' },
        { name: 'price', keyPath: 'price' },
        { name: 'categoryPrice', keyPath: ['category', 'price'] }, // Compound index
      ],
    },
  ],
}

// Query by index
const electronics = await dbUtil.query('products', {
  index: 'category',
  // Can use with KeyRange for more complex queries
})

// Query with compound index
const expensiveElectronics = await dbUtil.query('products', {
  index: 'categoryPrice',
  direction: 'prev', // Descending order
  limit: 10,
})
```

### Bulk Operations

```typescript
const users = [
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
  { name: 'User 3', email: 'user3@example.com' },
]

// Add multiple records at once
const keys = await dbUtil.bulkAdd('users', users)
console.log('Added users with keys:', keys)
```

### Transaction Management

```typescript
// Manual transaction for complex operations
const tx = dbUtil.transaction(['users', 'posts'], 'readwrite')

try {
  const usersStore = await tx.getStore('users')
  const postsStore = await tx.getStore('posts')

  // Perform multiple operations
  await addObjectData(usersStore, newUser)
  await addObjectData(postsStore, newPost)

  // Commit transaction
  await tx.commit()
} catch (error) {
  // Transaction will auto-abort on error
  console.error('Transaction failed:', error)
}
```

### Error Handling

```typescript
import {
  IndexedDBError,
  DatabaseNotFoundError,
  StoreNotFoundError,
} from '@osiris-smarttv/indexeddb-util'

try {
  const user = await dbUtil.get('users', 999)
} catch (error) {
  if (error instanceof IndexedDBError) {
    console.error('IndexedDB error:', error.message, error.code)
  }
}
```

## 🔧 Browser Compatibility

| Browser          | Version | Support |
| ---------------- | ------- | ------- |
| Chrome           | >= 53   | ✅ Full |
| Firefox          | >= 78   | ✅ Full |
| Safari           | >= 13   | ✅ Full |
| Edge             | >= 79   | ✅ Full |
| Samsung Internet | >= 6.2  | ✅ Full |
| Chrome Android   | >= 53   | ✅ Full |

### Smart TV Platform Support

- ✅ Samsung Tizen (2016+)
- ✅ LG webOS (3.0+)
- ✅ Android TV (5.0+)
- ✅ Fire TV
- ✅ Roku (WebView-based apps)

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run linting
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

## 📄 License

MIT

## 💡 Support

For support and questions, please open an issue on [GitHub Issues](https://github.com/OsirisTech-SmartTV/indexeddb-util/issues).

---

### Made with ❤️ by Osiris Smart TV Team
