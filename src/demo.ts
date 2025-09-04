import { IndexedDBUtil, type DatabaseConfig } from './index'

// Đơn giản configuration cho demo
const demoConfig: DatabaseConfig = {
  name: 'DemoApp',
  version: 1,
  stores: [
    {
      name: 'todos',
      config: { keyPath: 'id', autoIncrement: true },
      indices: [
        { name: 'status', keyPath: 'status' },
        { name: 'priority', keyPath: 'priority' },
      ],
    },
  ],
}

async function demo() {
  console.log('🚀 IndexedDB Util Demo - Chrome >= 53 Compatible')

  // Khởi tạo database
  const db = new IndexedDBUtil(demoConfig)
  await db.init()
  console.log('✅ Database initialized!')

  // Thêm một vài todos
  const todos = [
    { title: 'Learn IndexedDB', status: 'completed', priority: 'high' },
    { title: 'Build awesome app', status: 'pending', priority: 'medium' },
    { title: 'Deploy to production', status: 'pending', priority: 'high' },
  ]

  console.log('📝 Adding todos...')
  for (const todo of todos) {
    await db.add('todos', todo)
  }

  // Lấy tất cả todos
  const allTodos = await db.getAll('todos')
  console.log(`📋 Total todos: ${allTodos.length}`)

  // Query todos theo status
  const pendingTodos = await db
    .query('todos', { index: 'status' })
    .then(todos => todos.filter(t => t.status === 'pending'))
  console.log(`⏳ Pending todos: ${pendingTodos.length}`)

  // Count todos
  const totalCount = await db.count('todos')
  console.log(`🔢 Total count: ${totalCount}`)

  // Update một todo
  if (allTodos.length > 0) {
    const firstTodo = allTodos[0]
    await db.put('todos', { ...firstTodo, status: 'completed' })
    console.log('✏️ Updated todo status')
  }

  // Xóa database
  db.close()
  await IndexedDBUtil.deleteDatabase('DemoApp')
  console.log('🗑️ Database deleted')

  console.log('✨ Demo completed successfully!')
}

// Chạy demo (uncomment để test)
// demo().catch(console.error)

export { demo }
