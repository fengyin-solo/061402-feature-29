// 全局类型定义

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: number;
  userId: number;
  orderNumber: string;
  totalAmount: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  productName: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: string;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  recentOrders: Order[];
  topProducts: Product[];
}

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export type ResourceType = 'food' | 'water' | 'wood' | 'stone';

export interface TaskResource {
  food?: number;
  water?: number;
  wood?: number;
  stone?: number;
}

export interface Task {
  id: string;
  name: string;
  icon: string;
  description: string;
  duration: number;
  cost: TaskResource;
  gain: TaskResource;
  conflicts: string[];
  status: TaskStatus;
  progress: number;
  queuePosition: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface TaskConfig {
  name: string;
  icon: string;
  description: string;
  duration: number;
  cost: TaskResource;
  gain: TaskResource;
  conflicts: string[];
}

export interface TaskStoreState {
  taskQueue: Task[];
  currentTask: Task | null;
  completedTasks: Task[];
  isClockRunning: boolean;
  globalTime: number;
  tickInterval: number;
}

export interface Resources {
  food: number;
  water: number;
  wood: number;
  stone: number;
}