<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { UserPlus, Trash2, Loader2 } from 'lucide-vue-next'
import { useCleaningStore } from '@/stores/cleaning'
import { useUsersStore } from '@/stores/users'
import type { Room } from '@/types/room'
import type { CleaningFrequency } from '@/types/cleaning'

const props = defineProps<{
  open: boolean
  room: Room | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const cleaningStore = useCleaningStore()
const usersStore = useUsersStore()

const addStaffId = ref<string>('')
const addFrequency = ref<CleaningFrequency>('daily')
const saving = ref(false)
const removing = ref<string | null>(null)

const FREQUENCY_LABELS: Record<CleaningFrequency, string> = {
  daily:          'Daily',
  every_2_days:   'Every 2 Days',
  weekly:         'Weekly',
  after_checkout: 'After Each Checkout',
}

const roomAssignments = computed(() =>
  props.room ? cleaningStore.getAssignmentsForRoom(props.room.id) : []
)

const unassignedCleaners = computed(() => {
  const assignedIds = new Set(roomAssignments.value.map(a => a.staff_id))
  return cleaningStore.cleaners.filter(s => !assignedIds.has(s.id))
})

function getCleaner(staffId: string) {
  return usersStore.users.find(u => u.id === staffId)
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('')
}

watch(() => props.open, (open) => {
  if (open) {
    cleaningStore.init()
    if (usersStore.users.length === 0) usersStore.fetchUsers()
    addStaffId.value = ''
    addFrequency.value = 'daily'
  }
})

async function handleAssign() {
  if (!props.room || !addStaffId.value) return
  saving.value = true
  try {
    await cleaningStore.assign(props.room.id, addStaffId.value, addFrequency.value)
    toast.success(`${getCleaner(addStaffId.value)?.full_name} assigned to ${props.room.name}.`)
    addStaffId.value = ''
    addFrequency.value = 'daily'
  } catch (err) {
    toast.error(getApiError(err, 'Failed to assign staff.'))
  } finally {
    saving.value = false
  }
}

async function handleUnassign(staffId: string) {
  if (!props.room) return
  removing.value = staffId
  try {
    await cleaningStore.unassign(props.room.id, staffId)
    toast.success(`${getCleaner(staffId)?.full_name} removed from ${props.room.name}.`)
  } catch (err) {
    toast.error(getApiError(err, 'Failed to remove assignment.'))
  } finally {
    removing.value = null
  }
}

async function handleFrequencyChange(staffId: string, frequency: CleaningFrequency) {
  if (!props.room) return
  try {
    await cleaningStore.updateFrequency(props.room.id, staffId, frequency)
    toast.success('Cleaning frequency updated.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to update frequency.'))
  }
}
</script>

<template>
  <Sheet :open="open" @update:open="(v) => emit('update:open', v)">
    <SheetContent class="w-full sm:max-w-md flex flex-col gap-0 p-0">
      <SheetHeader class="px-6 pt-6 pb-4 border-b">
        <SheetTitle>Cleaning Assignments</SheetTitle>
        <SheetDescription v-if="room">
          Manage housekeeping staff assigned to <strong>{{ room.name }}</strong>.
        </SheetDescription>
      </SheetHeader>

      <div class="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

        <!-- Current assignments -->
        <div class="flex flex-col gap-3">
          <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Assigned Staff</h3>

          <div v-if="roomAssignments.length === 0" class="py-8 text-center text-sm text-muted-foreground border rounded-xl border-dashed">
            No staff assigned yet. Add someone below.
          </div>

          <div v-else class="flex flex-col gap-2">
            <div
              v-for="assignment in roomAssignments"
              :key="assignment.staff_id"
              class="flex items-center gap-3 rounded-xl border bg-card px-4 py-3"
            >
              <!-- Initials avatar -->
              <div class="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                {{ initials(getCleaner(assignment.staff_id)?.full_name ?? '?') }}
              </div>

              <!-- Name -->
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm truncate">{{ getCleaner(assignment.staff_id)?.full_name }}</p>
                <p class="text-xs text-muted-foreground capitalize">Cleaner</p>
              </div>

              <!-- Frequency selector -->
              <Select
                :model-value="assignment.frequency"
                @update:model-value="(v) => handleFrequencyChange(assignment.staff_id, v as CleaningFrequency)"
              >
                <SelectTrigger class="h-7 text-xs w-38 px-2 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="(label, key) in FREQUENCY_LABELS" :key="key" :value="key" class="text-xs">
                    {{ label }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <!-- Remove -->
              <button
                class="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors shrink-0"
                :disabled="removing === assignment.staff_id"
                @click="handleUnassign(assignment.staff_id)"
                title="Remove assignment"
              >
                <Loader2 v-if="removing === assignment.staff_id" class="size-4 animate-spin" />
                <Trash2 v-else class="size-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Add staff -->
        <div class="flex flex-col gap-3">
          <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">Add Staff</h3>

          <div v-if="unassignedCleaners.length === 0" class="py-4 text-center text-sm text-muted-foreground border rounded-xl border-dashed">
            All available cleaners are already assigned.
          </div>

          <div v-else class="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4">
            <div class="grid gap-1.5">
              <label class="text-xs font-medium text-muted-foreground">Staff Member</label>
              <Select v-model="addStaffId">
                <SelectTrigger>
                  <SelectValue placeholder="Select cleaner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="s in unassignedCleaners" :key="s.id" :value="s.id">
                    {{ s.full_name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="grid gap-1.5">
              <label class="text-xs font-medium text-muted-foreground">Cleaning Frequency</label>
              <Select v-model="addFrequency">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="(label, key) in FREQUENCY_LABELS" :key="key" :value="key">
                    {{ label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button :disabled="!addStaffId || saving" @click="handleAssign">
              <Loader2 v-if="saving" class="size-4 mr-2 animate-spin" />
              <UserPlus v-else class="size-4 mr-2" />
              Assign Staff
            </Button>
          </div>
        </div>

        <!-- Room info footer -->
        <div class="flex items-center gap-2 flex-wrap mt-auto pt-4 border-t">
          <Badge variant="outline" class="capitalize">{{ room?.type }}</Badge>
          <Badge variant="outline">{{ room?.capacity }} guest{{ room?.capacity === 1 ? '' : 's' }}</Badge>
          <Badge :variant="room?.status === 'available' ? 'default' : 'secondary'" class="capitalize">
            {{ room?.status?.replace('_', ' ') }}
          </Badge>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
