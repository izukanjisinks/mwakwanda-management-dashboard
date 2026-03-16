<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import ForbiddenDialog from '@/components/common/ForbiddenDialog.vue'
import ResultDialog from '@/components/common/ResultDialog.vue'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { useForbiddenHandler } from '@/composables/useForbiddenHandler'
import { useResultDialog } from '@/composables/useResultDialog'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

const { showForbiddenDialog, forbiddenResourceName, hideForbidden } = useForbiddenHandler()
const { resultDialogOpen, resultDialogType, resultDialogTitle, resultDialogMessage, hideResult } = useResultDialog()
const confirmDialog = useConfirmDialog()
</script>

<template>
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <RouterView />
    </SidebarInset>

    <!-- Global Forbidden Dialog -->
    <ForbiddenDialog
      :open="showForbiddenDialog"
      :resource-name="forbiddenResourceName"
      @update:open="hideForbidden"
    />

    <!-- Global Result Dialog -->
    <ResultDialog
      :open="resultDialogOpen"
      :type="resultDialogType"
      :title="resultDialogTitle"
      :message="resultDialogMessage"
      @update:open="hideResult"
    />

    <!-- Global Confirm Dialog -->
    <ConfirmDialog
      v-if="confirmDialog.open.value"
      :open="confirmDialog.open.value"
      :title="confirmDialog.title.value"
      :description="confirmDialog.description.value"
      :confirm-text="confirmDialog.confirmText.value"
      :cancel-text="confirmDialog.cancelText.value"
      :variant="confirmDialog.variant.value"
      :loading="confirmDialog.loading.value"
      @update:open="confirmDialog.handleOpenChange"
      @confirm="confirmDialog.handleConfirm"
      @cancel="confirmDialog.handleCancel"
    />
  </SidebarProvider>
</template>
