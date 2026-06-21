<template>
  <div class="island-container">
    <div class="island-header">
      <h1>🏝️ 海岛生存</h1>
      <p>在荒岛上建立你的生存基地</p>
    </div>

    <div class="task-clock-section">
      <TaskClock />
    </div>

    <div class="island-main">
      <div class="stats-panel">
        <div class="stat-card">
          <div class="stat-icon">🍖</div>
          <div class="stat-content">
            <div class="stat-number">{{ resources.food }}</div>
            <div class="stat-label">食物</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">💧</div>
          <div class="stat-content">
            <div class="stat-number">{{ resources.water }}</div>
            <div class="stat-label">淡水</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">🪵</div>
          <div class="stat-content">
            <div class="stat-number">{{ resources.wood }}</div>
            <div class="stat-label">木材</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">⛏️</div>
          <div class="stat-content">
            <div class="stat-number">{{ resources.stone }}</div>
            <div class="stat-label">石头</div>
          </div>
        </div>
      </div>
      
      <div class="actions-panel">
        <h3>📋 可执行操作</h3>
        
        <div class="action-grid">
          <div
            v-for="action in actionConfigs"
            :key="action.name"
            class="action-card"
            :class="{
              'action-disabled': !getActionStatus(action).canPerform,
              'action-conflict': getActionStatus(action).hasConflict,
              'action-running': isActionRunning(action.name),
              'action-queued': isActionQueued(action.name)
            }"
            @click="performAction(action)"
          >
            <div class="action-icon">{{ action.icon }}</div>
            <div class="action-title">
              {{ action.name }}
              <el-tag v-if="isActionRunning(action.name)" type="primary" size="small" effect="dark">执行中</el-tag>
              <el-tag v-else-if="isActionQueued(action.name)" type="warning" size="small">排队中 #{{ getQueuePosition(action.name) }}</el-tag>
            </div>
            <div class="action-desc">{{ action.description }}</div>
            <div class="action-time">
              <i class="el-icon-clock" /> 耗时: {{ formatDuration(action.duration) }}
            </div>
            <div v-if="Object.keys(action.cost).length > 0" class="action-cost">
              <i class="el-icon-remove" /> 需要: {{ formatResources(action.cost) }}
            </div>
            <div v-if="Object.keys(action.gain).length > 0" class="action-gain">
              <i class="el-icon-plus" /> 获得: {{ formatResources(action.gain) }}
            </div>
            <div v-if="action.conflicts.length > 0" class="action-conflict-info">
              <i class="el-icon-warning" /> 冲突: {{ action.conflicts.join('、') }}
            </div>
            <div v-if="!getActionStatus(action).canPerform" class="action-status-badge">
              <el-tag size="small" :type="getActionStatus(action).hasConflict ? 'danger' : 'info'">
                {{ getActionStatus(action).reason }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
      
      <div class="map-panel">
        <h3>🗺️ 海岛地图</h3>
        <div class="map-container">
          <div class="map-grid">
            <div v-for="(cell, index) in mapGrid" :key="index" 
                 :class="'map-cell ' + cell.type"
                 @click="exploreCell(index)">
              {{ cell.icon }}
            </div>
          </div>
          <div class="map-legend">
            <div class="legend-item">
              <span class="legend-icon">🌳</span>
              <span>森林</span>
            </div>
            <div class="legend-item">
              <span class="legend-icon">🏔️</span>
              <span>山地</span>
            </div>
            <div class="legend-item">
              <span class="legend-icon">🌊</span>
              <span>海洋</span>
            </div>
            <div class="legend-item">
              <span class="legend-icon">🏠</span>
              <span>营地</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="message-log">
      <h3>📜 生存日志</h3>
      <div class="log-list">
        <div v-for="(msg, index) in messageLog" :key="index" class="log-item">
          <span class="log-time">{{ msg.time }}</span>
          <span class="log-content">{{ msg.content }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useTaskStore } from '../store';
import TaskClock from '../layouts/components/TaskClock.vue';

const taskStore = useTaskStore();

const resources = ref({
  food: 100,
  water: 100,
  wood: 100,
  stone: 100
});

const messageLog = ref([
  { time: '00:00', content: '你来到了一个荒岛，开始你的生存之旅吧！' }
]);

const mapGrid = ref([
  { type: 'forest', icon: '🌳', explored: true },
  { type: 'forest', icon: '🌳', explored: true },
  { type: 'mountain', icon: '🏔️', explored: false },
  { type: 'ocean', icon: '🌊', explored: false },
  { type: 'camp', icon: '🏠', explored: true },
  { type: 'forest', icon: '🌳', explored: false },
  { type: 'ocean', icon: '🌊', explored: false },
  { type: 'mountain', icon: '🏔️', explored: false },
  { type: 'forest', icon: '🌳', explored: false }
]);

const actionConfigs = [
  {
    name: '采集食物',
    icon: '🍓',
    description: '在岛上寻找可食用的果实和动物',
    duration: 30000,
    cost: {},
    gain: { food: 20 },
    conflicts: ['砍伐木材', '挖掘石头']
  },
  {
    name: '收集淡水',
    icon: '💧',
    description: '收集雨水或净化海水',
    duration: 60000,
    cost: {},
    gain: { water: 30 },
    conflicts: ['砍伐木材', '挖掘石头']
  },
  {
    name: '砍伐木材',
    icon: '🪓',
    description: '砍伐树木获取木材资源',
    duration: 120000,
    cost: {},
    gain: { wood: 15 },
    conflicts: ['采集食物', '收集淡水', '挖掘石头']
  },
  {
    name: '挖掘石头',
    icon: '⛏️',
    description: '在岛上挖掘石头资源',
    duration: 180000,
    cost: {},
    gain: { stone: 10 },
    conflicts: ['采集食物', '收集淡水', '砍伐木材']
  },
  {
    name: '建造庇护所',
    icon: '🏠',
    description: '建造一个安全的住所',
    duration: 300000,
    cost: { wood: 50, stone: 30 },
    gain: {},
    conflicts: []
  },
  {
    name: '制作工具',
    icon: '🔨',
    description: '制作更高效的生存工具',
    duration: 120000,
    cost: { wood: 20, stone: 10 },
    gain: {},
    conflicts: []
  }
];

const addMessage = (content) => {
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  messageLog.value.push({ time, content });
  if (messageLog.value.length > 20) {
    messageLog.value.shift();
  }
};

const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`;
  }
  return `${remainingSeconds}秒`;
};

const formatResources = (res) => {
  const names = {
    food: '食物',
    water: '淡水',
    wood: '木材',
    stone: '石头'
  };
  return Object.entries(res)
    .map(([k, v]) => `${v}${names[k] || k}`)
    .join('、');
};

const getActionStatus = (action) => {
  const check = taskStore.canAddTask(action);
  const hasConflict = check.reason?.includes('冲突');
  return {
    canPerform: check.canAdd,
    reason: check.reason,
    hasConflict: !!hasConflict
  };
};

const isActionRunning = (name) => {
  return taskStore.currentTask?.name === name;
};

const isActionQueued = (name) => {
  return taskStore.queuedTasks.some(t => t.name === name);
};

const getQueuePosition = (name) => {
  const task = taskStore.queuedTasks.find(t => t.name === name);
  return task?.queuePosition || '-';
};

const performAction = (action) => {
  const status = getActionStatus(action);
  if (!status.canPerform) {
    ElMessage.error(status.reason);
    return;
  }

  const task = taskStore.addTask(action);
  if (task && action.name === '建造庇护所') {
    setTimeout(() => {
      if (taskStore.completedTasks.some(t => t.id === task.id)) {
        addMessage('庇护所建造完成！你现在有了一个安全的住所。');
      }
    }, action.duration + 100);
  }
  if (task && action.name === '制作工具') {
    setTimeout(() => {
      if (taskStore.completedTasks.some(t => t.id === task.id)) {
        addMessage('工具制作完成！你的工作效率提高了。');
      }
    }, action.duration + 100);
  }
};

const exploreCell = (index) => {
  const cell = mapGrid.value[index];
  if (cell.explored) {
    ElMessage.info('这个区域已经探索过了');
    return;
  }

  const exploreAction = {
    name: `探索${cell.icon}区域`,
    icon: cell.icon,
    description: '探索未知区域，可能遇到危险或发现资源',
    duration: 5000,
    cost: { food: 5, water: 5 },
    gain: {},
    conflicts: []
  };

  const status = taskStore.canAddTask(exploreAction);
  if (!status.canPerform) {
    ElMessage.error(status.reason);
    return;
  }

  ElMessageBox.confirm(
    `确定要探索这个区域吗？需要消耗5食物和5水，可能会遇到危险或发现资源。`,
    '探索未知区域',
    {
      confirmButtonText: '开始探索',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const task = taskStore.addTask(exploreAction);
    if (task) {
      const originalComplete = taskStore.onTaskComplete;
      taskStore.setCallbacks({
        ...taskStore,
        onTaskComplete: (completedTask, res) => {
          if (completedTask.id === task.id) {
            cell.explored = true;
            const random = Math.random();
            if (random < 0.3) {
              const foodGain = Math.floor(Math.random() * 20) + 10;
              resources.value.food += foodGain;
              taskStore.updateResources(resources.value);
              addMessage(`探索发现了食物！获得${foodGain}食物`);
              ElMessage.success(`探索发现了食物！获得${foodGain}食物`);
            } else if (random < 0.6) {
              const woodGain = Math.floor(Math.random() * 15) + 5;
              resources.value.wood += woodGain;
              taskStore.updateResources(resources.value);
              addMessage(`探索发现了木材！获得${woodGain}木材`);
              ElMessage.success(`探索发现了木材！获得${woodGain}木材`);
            } else if (random < 0.8) {
              const stoneGain = Math.floor(Math.random() * 10) + 5;
              resources.value.stone += stoneGain;
              taskStore.updateResources(resources.value);
              addMessage(`探索发现了石头！获得${stoneGain}石头`);
              ElMessage.success(`探索发现了石头！获得${stoneGain}石头`);
            } else {
              resources.value.food -= 10;
              resources.value.water -= 10;
              taskStore.updateResources(resources.value);
              addMessage(`探索遇到了危险！损失了10食物和10水`);
              ElMessage.warning(`探索遇到了危险！损失了10食物和10水`);
            }
          }
          if (originalComplete) {
            originalComplete(completedTask, res);
          }
        }
      });
    }
  }).catch(() => {
    addMessage('取消了探索');
  });
};

let resourceTimer = null;

onMounted(() => {
  taskStore.setResources(resources.value);
  taskStore.setCallbacks({
    onTaskComplete: (task, res) => {
      resources.value = { ...res };
    },
    onResourcesUpdate: (res) => {
      resources.value = { ...res };
    },
    onMessageAdd: (content) => {
      addMessage(content);
    }
  });

  addMessage('欢迎来到海岛生存游戏！');

  resourceTimer = setInterval(() => {
    resources.value.food -= 5;
    resources.value.water -= 5;
    taskStore.updateResources(resources.value);

    if (resources.value.food <= 0 || resources.value.water <= 0) {
      ElMessageBox.alert(
        '你的食物或水耗尽了，游戏结束！',
        '游戏结束',
        {
          confirmButtonText: '重新开始',
          type: 'error'
        }
      ).then(() => {
        taskStore.reset();
        resources.value = { food: 100, water: 100, wood: 100, stone: 100 };
        taskStore.setResources(resources.value);
        addMessage('重新开始游戏！');
      });
    }
  }, 60000);
});

onUnmounted(() => {
  if (resourceTimer) {
    clearInterval(resourceTimer);
  }
  taskStore.stopClock();
});
</script>

<style scoped>
.island-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.island-header {
  text-align: center;
  color: white;
  margin-bottom: 30px;
}

.island-header h1 {
  font-size: 48px;
  margin: 0 0 10px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.island-header p {
  font-size: 18px;
  margin: 0;
  opacity: 0.9;
}

.island-main {
  max-width: 1200px;
  margin: 0 auto;
}

.stats-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 48px;
  margin-right: 20px;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.actions-panel {
  background: white;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.actions-panel h3 {
  margin: 0 0 20px 0;
  font-size: 24px;
  color: #333;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.action-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.action-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.action-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.action-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.task-clock-section {
  max-width: 1200px;
  margin: 0 auto 30px;
}

.action-time,
.action-cost,
.action-gain,
.action-conflict-info {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-gain {
  color: #67c23a;
}

.action-conflict-info {
  color: #f56c6c;
}

.action-status-badge {
  margin-top: 8px;
}

.action-card.action-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-card.action-disabled:hover {
  transform: none;
  box-shadow: none;
  border-color: transparent;
}

.action-card.action-conflict {
  border-color: #f56c6c;
  background: #fef0f0;
}

.action-card.action-running {
  border-color: #409eff;
  background: #ecf5ff;
  animation: running-pulse 2s infinite;
}

.action-card.action-queued {
  border-color: #e6a23c;
  background: #fdf6ec;
}

@keyframes running-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(64, 158, 255, 0); }
}

.map-panel {
  background: white;
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.map-panel h3 {
  margin: 0 0 20px 0;
  font-size: 24px;
  color: #333;
}

.map-container {
  text-align: center;
}

.map-grid {
  display: grid;
  grid-template-columns: repeat(3, 100px);
  gap: 10px;
  justify-content: center;
  margin-bottom: 30px;
}

.map-cell {
  width: 100px;
  height: 100px;
  background: #f0f0f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid #ddd;
}

.map-cell:hover {
  transform: scale(1.05);
  border-color: #667eea;
}

.map-cell.explored {
  background: #e8f4fa;
  border-color: #409eff;
}

.map-legend {
  display: flex;
  justify-content: center;
  gap: 30px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.legend-icon {
  font-size: 24px;
}

.message-log {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.message-log h3 {
  margin: 0 0 20px 0;
  font-size: 24px;
  color: #333;
}

.log-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 10px;
}

.log-item {
  display: flex;
  margin-bottom: 8px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.log-time {
  font-weight: bold;
  color: #409eff;
  margin-right: 12px;
  min-width: 60px;
}

.log-content {
  flex: 1;
  color: #666;
}

@media (max-width: 768px) {
  .island-header h1 {
    font-size: 32px;
  }
  
  .stats-panel {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .action-grid {
    grid-template-columns: 1fr;
  }
}
</style>