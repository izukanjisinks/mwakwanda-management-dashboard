<script setup lang="ts">
import { ref, watch, provide } from 'vue'
import { VueFlow, useVueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { useWorkflowStore } from '@/stores/workflow'
import StateNode from './StateNode.vue'
import TransitionEdge from './TransitionEdge.vue'
import TransitionEditDialog from './TransitionEditDialog.vue'
import type { Connection, Node } from '@vue-flow/core'
import type { WorkflowState, WorkflowTransition } from '@/stores/workflow'
import { useResultDialog } from '@/composables/useResultDialog'

const { showError } = useResultDialog()

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

const workflowStore = useWorkflowStore()
const { onConnect, onNodeDragStop, addNodes, project, vueFlowRef } = useVueFlow()

// Centralized transition edit dialog state
const showTransitionDialog = ref(false)
const editingTransitionId = ref<string>('')
const editingTransitionData = ref<WorkflowTransition | null>(null)

const nodeTypes = {
  state: StateNode,
}

const edgeTypes = {
  default: TransitionEdge,
}

const defaultEdgeOptions = {
  type: 'default',
  markerEnd: MarkerType.ArrowClosed,
}

// Watch for changes in current workflow
watch(
  () => workflowStore.currentWorkflow,
  (newWorkflow) => {
    if (newWorkflow) {
      // Nodes and edges are already reactive
    }
  },
  { immediate: true }
)

// Handle new connections
onConnect(async (connection: Connection) => {
  if (!connection.source || !connection.target) return

  // Check if both nodes are saved (have backend IDs, not temporary node-* IDs)
  const sourceIsNew = connection.source.startsWith('node-')
  const targetIsNew = connection.target.startsWith('node-')

  // Don't allow connections between unsaved nodes
  if (sourceIsNew || targetIsNew) {
    showError('Cannot Create Transition', 'Please save both steps before creating a transition between them.')
    return
  }

  const newEdge = {
    id: `e${Date.now()}`,
    source: connection.source,
    target: connection.target,
    type: 'default',
    markerEnd: MarkerType.ArrowClosed,
    data: {
      name: 'New Transition',
      actionName: 'approve',
      conditionType: 'always',
      conditionValue: '',
    },
  }

  workflowStore.addEdge(newEdge)

  // Auto-save transition to backend since both nodes are saved
  if (workflowStore.currentWorkflow) {
    try {
      await workflowStore.createTransition(
        workflowStore.currentWorkflow.id,
        connection.source,
        connection.target,
        newEdge.data
      )
    } catch (err) {
      console.error('Failed to create transition:', err)
      // Remove the edge if creation failed
      workflowStore.removeEdge(newEdge.id)
      showError('Failed to Create Transition', 'Failed to create transition. Please try again.')
    }
  }
})

// Handle node drag
onNodeDragStop((event) => {
  const node = event.node
  workflowStore.updateNodePosition(node.id, node.position)
})

// Handle drop from palette
function onDrop(event: DragEvent) {
  if (!event.dataTransfer) return

  const stateType = event.dataTransfer.getData('application/vueflow') as 'initial' | 'middle' | 'final'
  if (!stateType) return

  const { left, top } = vueFlowRef.value?.getBoundingClientRect() || { left: 0, top: 0 }
  const position = project({
    x: event.clientX - left,
    y: event.clientY - top,
  })

  const newNode: Node<WorkflowState> = {
    id: `node-${Date.now()}`,
    type: 'state',
    position,
    data: {
      id: `node-${Date.now()}`,
      name: `New ${stateType} State`,
      stateType,
      displayOrder: (workflowStore.currentWorkflow?.nodes.length || 0) + 1,
      stepId: `node-${Date.now()}`,
      allowedRoles: [],
      requiresAllApprovers: false,
      minApprovals: 1,
    },
  }

  workflowStore.addNode(newNode)
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

// Handle transition edit request from edge
function handleTransitionEdit(transitionId: string, data: WorkflowTransition) {
  editingTransitionId.value = transitionId
  editingTransitionData.value = data
  showTransitionDialog.value = true
}

// Provide the edit handler to child edge components
provide('openTransitionEdit', handleTransitionEdit)

// Handle transition save
async function handleTransitionSave(data: Partial<WorkflowTransition>) {
  if (!editingTransitionId.value) return

  // Update local state first
  workflowStore.updateEdgeData(editingTransitionId.value, data)

  // Determine if this is a new transition (temporary ID) or existing transition (UUID)
  const isNewTransition = editingTransitionId.value.startsWith('e')

  try {
    if (isNewTransition && workflowStore.currentWorkflow) {
      // Get the edge to find source and target
      const edge = workflowStore.currentWorkflow.edges.find(e => e.id === editingTransitionId.value)
      if (edge) {
        // Create new transition in backend
        await workflowStore.createTransition(
          workflowStore.currentWorkflow.id,
          edge.source,
          edge.target,
          data as WorkflowTransition
        )
      }
    } else if (!isNewTransition) {
      // Update existing transition in backend
      await workflowStore.updateTransition(editingTransitionId.value, data)
    }
  } catch (err) {
    console.error('Failed to save transition:', err)
    showError('Failed to Save Transition', 'Failed to save transition. Please try again.')
  }
}
</script>

<template>
  <div class="w-full h-full">
    <VueFlow
      v-if="workflowStore.currentWorkflow"
      v-model:nodes="workflowStore.currentWorkflow.nodes"
      v-model:edges="workflowStore.currentWorkflow.edges"
      :node-types="nodeTypes"
      :edge-types="edgeTypes"
      :default-edge-options="defaultEdgeOptions"
      class="bg-background"
      @drop="onDrop"
      @dragover="onDragOver"
      fit-view-on-init
    >
      <Background pattern-color="#aaa" :gap="16" />
      <Controls />
      <MiniMap />
    </VueFlow>
    <div v-else class="flex items-center justify-center h-full text-muted-foreground">
      Select a workflow to edit
    </div>

    <!-- Centralized Transition Edit Dialog -->
    <TransitionEditDialog
      :open="showTransitionDialog"
      :transition-data="editingTransitionData"
      @update:open="(val) => showTransitionDialog = val"
      @save="handleTransitionSave"
    />
  </div>
</template>

<style>
.vue-flow__node {
  border-radius: 8px;
}

.vue-flow__edge-path {
  stroke-width: 2;
}

.vue-flow__minimap {
  background-color: hsl(var(--background));
}
</style>
