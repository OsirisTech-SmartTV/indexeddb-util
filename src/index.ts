/**
 * Interface for object store configuration
 */
export interface IDBStoreConfig {
  name: string
  config: IDBObjectStoreParameters
  indices?: IDBIndexConfig[]
  data?: Array<{ id: string | number; [key: string]: any }>
}

/**
 * Interface for index configuration
 */
export interface IDBIndexConfig {
  name: string
  keyPath: string | string[]
  options?: IDBIndexParameters
}

/**
 * Interface for query options
 */
export interface QueryOptions {
  index?: string
  direction?: IDBCursorDirection
  limit?: number
  offset?: number
}

/**
 * Interface for database configuration
 */
export interface DatabaseConfig {
  name: string
  version: number
  stores: IDBStoreConfig[]
}

/**
 * Custom error classes for better error handling
 */
export class IndexedDBError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'IndexedDBError'
  }
}

export class DatabaseNotFoundError extends IndexedDBError {
  constructor(dbName: string) {
    super(`Database "${dbName}" not found`)
    this.code = 'DB_NOT_FOUND'
  }
}

export class StoreNotFoundError extends IndexedDBError {
  constructor(storeName: string) {
    super(`Object store "${storeName}" not found`)
    this.code = 'STORE_NOT_FOUND'
  }
}

export class TransactionError extends IndexedDBError {
  constructor(message: string) {
    super(message)
    this.code = 'TRANSACTION_ERROR'
  }
}

/**
 * Checks if IndexedDB is supported in the current browser
 * Supports Chrome >= 53, Firefox >= 78, Safari >= 13, Edge >= 79
 */
export const isIndexedDBSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    'indexedDB' in window &&
    indexedDB !== null &&
    typeof indexedDB.open === 'function'
  )
}

/**
 * Gets browser compatibility info for IndexedDB features
 */
export const getBrowserCompatibility = () => {
  if (!isIndexedDBSupported()) {
    return { supported: false, features: {} }
  }

  const features = {
    transactions: typeof IDBTransaction !== 'undefined',
    cursors: typeof IDBCursor !== 'undefined',
    keyRange: typeof IDBKeyRange !== 'undefined',
    multiEntry: true, // Supported in Chrome >= 53
    compound: true, // Supported in Chrome >= 53
  }

  return { supported: true, features }
}

/**
 * Creates and initializes an IndexedDB database with the specified stores and initial data
 * @param name - The name of the database to create
 * @param version - The version of the database
 * @param stores - Configuration for object stores including optional initial data
 * @returns A promise that resolves to the database instance
 */
const createDB = (
  name: string,
  version: number,
  stores?: IDBStoreConfig[]
): Promise<IDBDatabase> => {
  // Check for browser compatibility
  if (!isIndexedDBSupported()) {
    throw new IndexedDBError('IndexedDB is not supported in this browser!')
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, version)

    // Create or update object stores when database structure needs to change
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (stores?.length) {
        stores.forEach(store => {
          let objectStore: IDBObjectStore

          if (!db.objectStoreNames.contains(store.name)) {
            objectStore = db.createObjectStore(store.name, store.config)
          } else {
            objectStore = (event.target as any).transaction.objectStore(
              store.name
            )
          }

          // Create indices if specified
          if (store.indices?.length) {
            store.indices.forEach(indexConfig => {
              if (!objectStore.indexNames.contains(indexConfig.name)) {
                objectStore.createIndex(
                  indexConfig.name,
                  indexConfig.keyPath,
                  indexConfig.options
                )
              }
            })
          }
        })
      }
    }

    // Handle successful database open
    request.onsuccess = async (event: Event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // If no stores or data to initialize, resolve immediately
      if (!stores?.length) {
        return resolve(db)
      }

      try {
        // Initialize data for each store that has initial data
        const storesWithData = stores.filter(
          store => Array.isArray(store.data) && store.data.length > 0
        )

        if (storesWithData.length === 0) {
          return resolve(db)
        }

        // Process each store with data
        for (const store of storesWithData) {
          // Create a single transaction for all operations on this store
          const tx = db.transaction(store.name, 'readwrite')
          const objectStore = tx.objectStore(store.name)

          // Get all existing data from the store
          const existingData = await new Promise<any[]>((res, rej) => {
            const getAllRequest = objectStore.getAll()
            getAllRequest.onsuccess = e => res((e.target as IDBRequest).result)
            getAllRequest.onerror = e => rej((e.target as IDBRequest).error)
          })

          // Add each data item if it doesn't already exist
          const existingIds = new Set(existingData.map(item => item.id))

          for (const item of store.data || []) {
            if (!existingIds.has(item.id)) {
              objectStore.add(item)
            }
          }

          // Handle transaction completion
          await new Promise<void>((res, rej) => {
            tx.oncomplete = () => res()
            tx.onerror = () =>
              rej(
                new TransactionError(tx.error?.message || 'Transaction failed')
              )
          })
        }

        resolve(db)
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new IndexedDBError('Unknown error occurred')
        )
      }
    }

    // Handle database open errors
    request.onerror = () => {
      reject(
        new IndexedDBError(request.error?.message || 'Failed to open database')
      )
    }

    request.onblocked = () => {
      reject(new IndexedDBError('Database open request was blocked'))
    }
  })
}

/**
 * Opens an IndexedDB database with the specified name and version
 * @param name - The name of the database to open
 * @param version - The version of the database
 * @returns A promise that resolves to the database instance
 */
const openDB = (name: string, version: number): Promise<IDBDatabase> => {
  // Check for browser compatibility
  if (!isIndexedDBSupported()) {
    throw new IndexedDBError('IndexedDB is not supported in this browser!')
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, version)

    // Success handler - directly resolve with the database instance
    request.onsuccess = () => {
      resolve(request.result)
    }

    // Error handler - directly reject with the error
    request.onerror = () => {
      reject(
        new IndexedDBError(request.error?.message || 'Failed to open database')
      )
    }

    request.onblocked = () => {
      reject(new IndexedDBError('Database open request was blocked'))
    }
  })
}

/**
 * Interface for transaction handler
 */
export interface TransactionHandler {
  /** The transaction object */
  tx: IDBTransaction
  /** Gets an object store from the transaction */
  getStore(name: string): Promise<IDBObjectStore>
  /** Commits the transaction */
  commit(): Promise<void>
  /** Aborts the transaction */
  abort(): void
}

/**
 * Creates a transaction on the database for specified object stores
 * @param dbObject - The database connection
 * @param stores - Name of object store(s) to include in transaction (string or array of strings)
 * @param mode - Transaction mode ('readonly' or 'readwrite')
 * @returns A transaction handler object
 */
const transaction = (
  dbObject: IDBDatabase,
  stores: string | string[],
  mode: IDBTransactionMode
): TransactionHandler => {
  const tx = dbObject.transaction(stores, mode)

  return {
    tx,
    getStore(name: string): Promise<IDBObjectStore> {
      return new Promise((resolve, reject) => {
        // Set up error handler first
        tx.onerror = () => {
          reject(
            new TransactionError(tx.error?.message || 'Transaction failed')
          )
        }

        // Set up abort handler
        tx.onabort = () => {
          reject(
            new TransactionError(tx.error?.message || 'Transaction was aborted')
          )
        }

        try {
          // Get the object store
          const store = tx.objectStore(name)
          resolve(store)
        } catch (error) {
          reject(
            error instanceof Error
              ? new StoreNotFoundError(name)
              : new TransactionError('Failed to access object store')
          )
        }
      })
    },
    commit(): Promise<void> {
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () =>
          reject(
            new TransactionError(tx.error?.message || 'Transaction failed')
          )
        tx.onabort = () =>
          reject(new TransactionError('Transaction was aborted'))
      })
    },
    abort(): void {
      tx.abort()
    },
  }
}

/**
 * Retrieves a single object from an IndexedDB object store
 * @param store - The IndexedDB object store to query
 * @param key - The key of the object to retrieve
 * @returns A promise that resolves with the retrieved object or undefined if not found
 */
const getObjectData = <T = any>(
  store: IDBObjectStore,
  key: IDBValidKey
): Promise<T | undefined> => {
  return new Promise<T | undefined>((resolve, reject) => {
    const request = store.get(key)

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(
        new IndexedDBError(request.error?.message || 'Failed to retrieve data')
      )
    }
  })
}

/**
 * Retrieves all objects from an IndexedDB object store
 * @param store - The IndexedDB object store to query
 * @returns A promise that resolves with an array of all objects in the store
 */
const getAllObjectData = <T = any>(store: IDBObjectStore): Promise<T[]> => {
  return new Promise<T[]>((resolve, reject) => {
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(
        new IndexedDBError(
          request.error?.message || 'Failed to retrieve all data'
        )
      )
    }
  })
}

/**
 * Queries objects from an IndexedDB object store with advanced options
 * @param store - The IndexedDB object store to query
 * @param options - Query options including index, direction, limit, offset
 * @returns A promise that resolves with an array of matching objects
 */
const queryObjectData = <T = any>(
  store: IDBObjectStore,
  options: QueryOptions = {}
): Promise<T[]> => {
  return new Promise<T[]>((resolve, reject) => {
    const { index, direction = 'next', limit, offset = 0 } = options
    const results: T[] = []
    let skipped = 0
    let counted = 0

    try {
      const source = index ? store.index(index) : store
      const request = source.openCursor(undefined, direction)

      request.onsuccess = () => {
        const cursor = request.result

        if (!cursor) {
          resolve(results)
          return
        }

        // Skip offset items
        if (skipped < offset) {
          skipped++
          cursor.continue()
          return
        }

        // Check limit
        if (limit && counted >= limit) {
          resolve(results)
          return
        }

        results.push(cursor.value)
        counted++
        cursor.continue()
      }

      request.onerror = () => {
        reject(new IndexedDBError(request.error?.message || 'Query failed'))
      }
    } catch (error) {
      reject(
        new IndexedDBError(
          error instanceof Error ? error.message : 'Query setup failed'
        )
      )
    }
  })
}

/**
 * Counts objects in an IndexedDB object store
 * @param store - The IndexedDB object store to count
 * @param keyRange - Optional key range to count within
 * @returns A promise that resolves with the count
 */
const countObjectData = (
  store: IDBObjectStore,
  keyRange?: IDBKeyRange
): Promise<number> => {
  return new Promise<number>((resolve, reject) => {
    const request = store.count(keyRange)

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(new IndexedDBError(request.error?.message || 'Count failed'))
    }
  })
}

/**
 * Adds a new object to an IndexedDB object store
 * @param store - The IndexedDB object store to add data to
 * @param data - The data object to add to the store
 * @returns A promise that resolves with all objects in the store after addition
 * @throws If the add operation fails (e.g., due to constraint violation)
 */
const addObjectData = <T = any>(
  store: IDBObjectStore,
  data: T
): Promise<T[]> => {
  return new Promise<T[]>((resolve, reject) => {
    const request = store.add(data)

    request.onsuccess = () => {
      // After successful addition, get all data from the store
      getAllObjectData<T>(store)
        .then(allData => resolve(allData))
        .catch(error => reject(error))
    }

    request.onerror = () => {
      const error = request.error
      reject(
        new IndexedDBError(error?.message || 'Failed to add data to store')
      )
    }
  })
}

/**
 * Puts (adds or updates) an object in the IndexedDB object store
 * @param store - The IndexedDB object store to put data into
 * @param data - The data object to put in the store
 * @returns A promise that resolves with the key of the stored object
 */
const putObjectData = <T = any>(
  store: IDBObjectStore,
  data: T
): Promise<IDBValidKey> => {
  return new Promise<IDBValidKey>((resolve, reject) => {
    const request = store.put(data)

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(new IndexedDBError(request.error?.message || 'Failed to put data'))
    }
  })
}

/**
 * Bulk adds multiple objects to an IndexedDB object store
 * @param store - The IndexedDB object store to add data to
 * @param dataArray - Array of data objects to add
 * @returns A promise that resolves with an array of added object keys
 */
const bulkAddObjectData = <T = any>(
  store: IDBObjectStore,
  dataArray: T[]
): Promise<IDBValidKey[]> => {
  return new Promise<IDBValidKey[]>((resolve, reject) => {
    const results: IDBValidKey[] = []
    let completed = 0

    if (dataArray.length === 0) {
      resolve([])
      return
    }

    dataArray.forEach((data, index) => {
      const request = store.add(data)

      request.onsuccess = () => {
        results[index] = request.result
        completed++

        if (completed === dataArray.length) {
          resolve(results)
        }
      }

      request.onerror = () => {
        reject(
          new IndexedDBError(
            request.error?.message || `Failed to add item at index ${index}`
          )
        )
      }
    })
  })
}

/**
 * Updates an object in the IndexedDB object store
 * @param store - The IndexedDB object store to update data in
 * @param keyPath - The property name to use for finding the object to update
 * @param key - The value to match against the keyPath
 * @param newData - The new data to replace the existing object with
 * @returns A promise that resolves with all objects in the store after update
 * @throws If the object is not found or update operation fails
 */
const updateObjectData = <T = any>(
  store: IDBObjectStore,
  keyPath: string,
  key: string | number,
  newData: T
): Promise<T[]> => {
  return new Promise<T[]>((resolve, reject) => {
    // First check if the object exists
    getAllObjectData<T>(store)
      .then(allData => {
        const target = allData.find((data: any) => data[keyPath] === key)

        if (!target) {
          return reject(
            new IndexedDBError(
              `There's no object in the ${store.name} whose ${keyPath} matches ${key}.`
            )
          )
        }

        // Open a cursor to find and update the object
        const cursorRequest = store.openCursor()
        let found = false

        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result

          // If cursor is null, we've reached the end without finding the object
          if (!cursor) {
            if (!found) {
              reject(
                new IndexedDBError(
                  `Failed to locate object for update with ${keyPath}=${key}`
                )
              )
            }
            return
          }

          // Check if this is our target object
          if (cursor.value[keyPath] === key) {
            found = true
            const updateRequest = cursor.update(newData)

            updateRequest.onsuccess = () => {
              getAllObjectData<T>(store)
                .then(updatedData => resolve(updatedData))
                .catch(error => reject(error))
            }

            updateRequest.onerror = () => {
              reject(
                new IndexedDBError(
                  updateRequest.error?.message || 'Update operation failed'
                )
              )
            }
          } else {
            // Continue to the next item
            cursor.continue()
          }
        }

        cursorRequest.onerror = () => {
          reject(
            new IndexedDBError(
              cursorRequest.error?.message || 'Cursor operation failed'
            )
          )
        }
      })
      .catch(error => reject(error))
  })
}

/**
 * Deletes an object from an IndexedDB object store
 * @param store - The IndexedDB object store to delete data from
 * @param key - The key of the object to delete
 * @returns A promise that resolves with a tuple containing [deletedObject, allRemainingObjects]
 * @throws If the delete operation fails
 */
const deleteObjectData = <T = any>(
  store: IDBObjectStore,
  key: IDBValidKey
): Promise<[T | undefined, T[]]> => {
  return new Promise<[T | undefined, T[]]>((resolve, reject) => {
    // First get the object to return it after deletion
    let deletedObject: T | undefined

    getObjectData<T>(store, key)
      .then(object => {
        deletedObject = object

        if (deletedObject === undefined) {
          return reject(
            new IndexedDBError(
              `Object with key "${key}" not found in store "${store.name}"`
            )
          )
        }

        // Now delete the object
        const deleteRequest = store.delete(key)

        deleteRequest.onsuccess = () => {
          // After successful deletion, get all remaining data
          getAllObjectData<T>(store)
            .then(allData => resolve([deletedObject, allData]))
            .catch(error => reject(error))
        }

        deleteRequest.onerror = () => {
          reject(
            new IndexedDBError(
              deleteRequest.error?.message || 'Delete operation failed'
            )
          )
        }
      })
      .catch(error => {
        reject(
          new IndexedDBError(
            `Failed to retrieve object before deletion: ${error.message}`
          )
        )
      })
  })
}

/**
 * Clears all objects from an IndexedDB object store
 * @param store - The IndexedDB object store to clear
 * @returns A promise that resolves when the store is cleared
 */
const clearObjectStore = (store: IDBObjectStore): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const request = store.clear()

    request.onsuccess = () => {
      resolve()
    }

    request.onerror = () => {
      reject(
        new IndexedDBError(request.error?.message || 'Clear operation failed')
      )
    }
  })
}

/**
 * High-level class for easy IndexedDB operations
 */
export class IndexedDBUtil {
  private dbName: string
  private dbVersion: number
  private db: IDBDatabase | null = null
  private stores: IDBStoreConfig[]

  constructor(config: DatabaseConfig) {
    this.dbName = config.name
    this.dbVersion = config.version
    this.stores = config.stores
  }

  /**
   * Initialize the database connection
   */
  async init(): Promise<void> {
    if (!isIndexedDBSupported()) {
      throw new IndexedDBError('IndexedDB is not supported in this browser!')
    }

    this.db = await createDB(this.dbName, this.dbVersion, this.stores)
  }

  /**
   * Get the database instance
   */
  getDB(): IDBDatabase {
    if (!this.db) {
      throw new IndexedDBError('Database not initialized. Call init() first.')
    }
    return this.db
  }

  /**
   * Create a transaction for multiple operations
   */
  transaction(
    stores: string | string[],
    mode: IDBTransactionMode = 'readonly'
  ): TransactionHandler {
    return transaction(this.getDB(), stores, mode)
  }

  /**
   * Get a single object by key
   */
  async get<T = any>(
    storeName: string,
    key: IDBValidKey
  ): Promise<T | undefined> {
    const tx = this.transaction(storeName, 'readonly')
    const store = await tx.getStore(storeName)
    return getObjectData<T>(store, key)
  }

  /**
   * Get all objects from a store
   */
  async getAll<T = any>(storeName: string): Promise<T[]> {
    const tx = this.transaction(storeName, 'readonly')
    const store = await tx.getStore(storeName)
    return getAllObjectData<T>(store)
  }

  /**
   * Query objects with advanced options
   */
  async query<T = any>(
    storeName: string,
    options: QueryOptions = {}
  ): Promise<T[]> {
    const tx = this.transaction(storeName, 'readonly')
    const store = await tx.getStore(storeName)
    return queryObjectData<T>(store, options)
  }

  /**
   * Count objects in a store
   */
  async count(storeName: string, keyRange?: IDBKeyRange): Promise<number> {
    const tx = this.transaction(storeName, 'readonly')
    const store = await tx.getStore(storeName)
    return countObjectData(store, keyRange)
  }

  /**
   * Add a new object
   */
  async add<T = any>(storeName: string, data: T): Promise<T[]> {
    const tx = this.transaction(storeName, 'readwrite')
    const store = await tx.getStore(storeName)
    const result = await addObjectData<T>(store, data)
    await tx.commit()
    return result
  }

  /**
   * Put (add or update) an object
   */
  async put<T = any>(storeName: string, data: T): Promise<IDBValidKey> {
    const tx = this.transaction(storeName, 'readwrite')
    const store = await tx.getStore(storeName)
    const result = await putObjectData<T>(store, data)
    await tx.commit()
    return result
  }

  /**
   * Bulk add multiple objects
   */
  async bulkAdd<T = any>(
    storeName: string,
    dataArray: T[]
  ): Promise<IDBValidKey[]> {
    const tx = this.transaction(storeName, 'readwrite')
    const store = await tx.getStore(storeName)
    const result = await bulkAddObjectData<T>(store, dataArray)
    await tx.commit()
    return result
  }

  /**
   * Update an object
   */
  async update<T = any>(
    storeName: string,
    keyPath: string,
    key: string | number,
    newData: T
  ): Promise<T[]> {
    const tx = this.transaction(storeName, 'readwrite')
    const store = await tx.getStore(storeName)
    const result = await updateObjectData<T>(store, keyPath, key, newData)
    await tx.commit()
    return result
  }

  /**
   * Delete an object
   */
  async delete<T = any>(
    storeName: string,
    key: IDBValidKey
  ): Promise<[T | undefined, T[]]> {
    const tx = this.transaction(storeName, 'readwrite')
    const store = await tx.getStore(storeName)
    const result = await deleteObjectData<T>(store, key)
    await tx.commit()
    return result
  }

  /**
   * Clear all objects from a store
   */
  async clear(storeName: string): Promise<void> {
    const tx = this.transaction(storeName, 'readwrite')
    const store = await tx.getStore(storeName)
    await clearObjectStore(store)
    await tx.commit()
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  /**
   * Delete the entire database
   */
  static async deleteDatabase(name: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(name)

      deleteRequest.onsuccess = () => {
        resolve()
      }

      deleteRequest.onerror = () => {
        reject(
          new IndexedDBError(
            deleteRequest.error?.message || 'Failed to delete database'
          )
        )
      }

      deleteRequest.onblocked = () => {
        reject(new IndexedDBError('Database deletion was blocked'))
      }
    })
  }
}

/**
 * Utility functions for key range operations
 */
export const KeyRange = {
  /**
   * Create a key range that matches a single value
   */
  only(value: any): IDBKeyRange {
    return IDBKeyRange.only(value)
  },

  /**
   * Create a key range with lower bound
   */
  lowerBound(lower: any, open = false): IDBKeyRange {
    return IDBKeyRange.lowerBound(lower, open)
  },

  /**
   * Create a key range with upper bound
   */
  upperBound(upper: any, open = false): IDBKeyRange {
    return IDBKeyRange.upperBound(upper, open)
  },

  /**
   * Create a key range with both bounds
   */
  bound(
    lower: any,
    upper: any,
    lowerOpen = false,
    upperOpen = false
  ): IDBKeyRange {
    return IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen)
  },
}

const DB = {
  createDB,
  openDB,
  transaction,
  getObjectData,
  getAllObjectData,
  queryObjectData,
  countObjectData,
  addObjectData,
  putObjectData,
  bulkAddObjectData,
  deleteObjectData,
  updateObjectData,
  clearObjectStore,
  isIndexedDBSupported,
  getBrowserCompatibility,
  IndexedDBUtil,
  KeyRange,
}

export {
  createDB,
  openDB,
  transaction,
  getObjectData,
  getAllObjectData,
  queryObjectData,
  countObjectData,
  addObjectData,
  putObjectData,
  bulkAddObjectData,
  deleteObjectData,
  updateObjectData,
  clearObjectStore,
}

export default DB
