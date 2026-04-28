<script setup lang="ts">
import { ref } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Building2 } from 'lucide-vue-next'
import type { OrgOption } from '@/types/auth'

const props = defineProps<{
  open: boolean
  orgs: OrgOption[]
  loading: boolean
}>()

const emit = defineEmits<{
  select: [orgId: string]
  dismiss: []
}>()

const selected = ref<string | null>(null)

function handleSelect(orgId: string) {
  selected.value = orgId
  emit('select', orgId)
}
</script>

<template>
  <Dialog :open="open" @update:open="!$event && emit('dismiss')">
    <DialogContent class="sm:max-w-sm" :show-close="false">
      <DialogHeader>
        <DialogTitle>Select Organisation</DialogTitle>
        <DialogDescription>
          You have multiple organisation accounts. Choose one to continue.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-2 py-2">
        <Button
          v-for="org in orgs"
          :key="org.org_id"
          variant="outline"
          class="h-auto justify-start gap-3 px-4 py-3 text-left"
          :disabled="loading"
          @click="handleSelect(org.org_id)"
        >
          <Building2 class="size-4 shrink-0 text-primary" />
          <span class="font-medium">{{ org.name }}</span>
          <Loader2
            v-if="loading && selected === org.org_id"
            class="ml-auto size-4 animate-spin text-muted-foreground"
          />
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
