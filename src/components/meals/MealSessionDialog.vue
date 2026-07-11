<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { useMealSessionsStore } from '@/stores/mealSessions'
import { menusApi } from '@/services/api/menus'
import { getApiError } from '@/utils/errors'
import { MEAL_PERIODS, WEEKDAYS } from '@/constants/meals'
import type { MealSession, MealType, Weekday } from '@/types/meal-collection'
import type { MenuItem } from '@/types/menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

const props = defineProps<{ open: boolean; session: MealSession | null }>()
const emit = defineEmits<{ 'update:open': [boolean] }>()

const store = useMealSessionsStore()
const isEdit = computed(() => !!props.session)

const form = ref({
  meal_period: '' as MealType | '',
  buffet_menu_item_id: '',
  start_time: '',
  end_time: '',
  auto_open_close: true,
  days_of_week: [] as Weekday[],
})

watch(() => props.open, (open) => {
  if (!open) return
  if (props.session) {
    form.value = {
      meal_period: props.session.meal_period,
      buffet_menu_item_id: props.session.buffet_menu_item_id,
      start_time: props.session.start_time,
      end_time: props.session.end_time,
      auto_open_close: props.session.auto_open_close,
      days_of_week: [...props.session.days_of_week],
    }
  } else {
    form.value = { meal_period: '', buffet_menu_item_id: '', start_time: '', end_time: '', auto_open_close: true, days_of_week: [] }
  }
})

// ── Buffet menu items ──────────────────────────────────────────────────────────
const buffetItems = ref<MenuItem[]>([])
const menuLoading = ref(false)
async function loadBuffetItems() {
  menuLoading.value = true
  try {
    const res = await menusApi.getMenu({ page_size: 200 })
    buffetItems.value = (res.items?.data ?? []).filter(m => m.category === 'buffet')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load buffet menu items.'))
  } finally {
    menuLoading.value = false
  }
}
onMounted(loadBuffetItems)

function toggleDay(day: Weekday) {
  form.value.days_of_week = form.value.days_of_week.includes(day)
    ? form.value.days_of_week.filter(d => d !== day)
    : [...form.value.days_of_week, day]
}
const allDaysSelected = computed(() => form.value.days_of_week.length === WEEKDAYS.length)
function toggleAllDays() {
  form.value.days_of_week = allDaysSelected.value ? [] : WEEKDAYS.map(d => d.value as Weekday)
}

const canSubmit = computed(() =>
  form.value.meal_period !== '' &&
  form.value.buffet_menu_item_id !== '' &&
  form.value.start_time !== '' &&
  form.value.end_time !== '' &&
  form.value.days_of_week.length > 0,
)

const saving = ref(false)
async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    const payload = {
      meal_period: form.value.meal_period as MealType,
      buffet_menu_item_id: form.value.buffet_menu_item_id,
      start_time: form.value.start_time,
      end_time: form.value.end_time,
      auto_open_close: form.value.auto_open_close,
      days_of_week: form.value.days_of_week,
    }
    if (isEdit.value && props.session) {
      await store.updateSession(props.session.id, payload)
      toast.success('Session updated.')
    } else {
      await store.createSession(payload)
      toast.success('Meal collect session created.')
    }
    emit('update:open', false)
  } catch (err) {
    toast.error(getApiError(err, 'Failed to save meal session.'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? 'Edit Meal Collect Session' : 'New Meal Collect Session' }}</DialogTitle>
        <DialogDescription>A recurring buffet schedule residents collect against.</DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <div>
          <Label class="text-xs">Meal Period <span class="text-destructive">*</span></Label>
          <Select v-model="form.meal_period">
            <SelectTrigger class="mt-1.5"><SelectValue placeholder="Select meal period…" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="p in MEAL_PERIODS" :key="p.value" :value="p.value">{{ p.label }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label class="text-xs">Buffet Type <span class="text-destructive">*</span></Label>
          <Select v-if="!menuLoading && buffetItems.length > 0" v-model="form.buffet_menu_item_id">
            <SelectTrigger class="mt-1.5"><SelectValue placeholder="Select buffet…" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="mi in buffetItems" :key="mi.id" :value="mi.id">{{ mi.name }} — ZMW {{ mi.price.toLocaleString() }}</SelectItem>
            </SelectContent>
          </Select>
          <p v-else-if="menuLoading" class="mt-1.5 text-xs text-muted-foreground">Loading menu…</p>
          <p v-else class="mt-1.5 text-xs text-amber-600 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5">
            No buffet items on the menu yet — add one under Menus first.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <Label class="text-xs">Start Time <span class="text-destructive">*</span></Label>
            <Input v-model="form.start_time" type="time" class="mt-1.5" />
          </div>
          <div>
            <Label class="text-xs">End Time <span class="text-destructive">*</span></Label>
            <Input v-model="form.end_time" type="time" class="mt-1.5" />
          </div>
        </div>

        <label class="flex items-start gap-3 cursor-pointer">
          <Checkbox v-model="form.auto_open_close" class="mt-0.5" />
          <div>
            <p class="text-sm font-medium">Auto open/close</p>
            <p class="text-xs text-muted-foreground mt-0.5">Automatically open and close this session at the scheduled time</p>
          </div>
        </label>

        <div>
          <div class="flex items-center justify-between">
            <Label class="text-xs">Days <span class="text-destructive">*</span></Label>
            <button type="button" class="text-xs text-primary hover:underline" @click="toggleAllDays">
              {{ allDaysSelected ? 'Clear all' : 'Select all' }}
            </button>
          </div>
          <div class="flex flex-wrap gap-1.5 mt-1.5">
            <button
              v-for="d in WEEKDAYS" :key="d.value" type="button"
              class="px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors"
              :class="form.days_of_week.includes(d.value as Weekday) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/40'"
              @click="toggleDay(d.value as Weekday)"
            >
              {{ d.label }}
            </button>
          </div>
        </div>
      </div>

      <DialogFooter class="gap-2 mt-1">
        <Button variant="outline" :disabled="saving" @click="emit('update:open', false)">Cancel</Button>
        <Button :disabled="!canSubmit || saving" @click="submit">
          {{ isEdit ? 'Save Changes' : 'Create Session' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
