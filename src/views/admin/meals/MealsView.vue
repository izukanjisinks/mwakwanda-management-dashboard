<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Pencil, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useMealsStore } from '@/stores/meals'
import type { MealPlan } from '@/types/meal'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import MealPlanDialog from '@/components/meals/MealPlanDialog.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const store = useMealsStore()

const dialogOpen = ref(false)
const selectedPlan = ref<MealPlan | null>(null)
const deleteDialogOpen = ref(false)
const planToDelete = ref<MealPlan | null>(null)
const deleting = ref(false)

onMounted(() => store.fetchPlans())

function openCreate() {
  selectedPlan.value = null
  dialogOpen.value = true
}

function openEdit(plan: MealPlan) {
  selectedPlan.value = plan
  dialogOpen.value = true
}

function confirmDelete(plan: MealPlan) {
  planToDelete.value = plan
  deleteDialogOpen.value = true
}

async function handleDelete() {
  if (!planToDelete.value) return
  deleting.value = true
  const name = planToDelete.value.name
  try {
    await store.deletePlan(planToDelete.value.id)
    toast.success(`"${name}" deleted.`)
  } catch {
    toast.error('Failed to delete meal plan.')
  } finally {
    deleting.value = false
    deleteDialogOpen.value = false
    planToDelete.value = null
  }
}

async function toggleActive(plan: MealPlan) {
  try {
    await store.updatePlan(plan.id, { is_active: !plan.is_active })
    toast.success(`"${plan.name}" ${plan.is_active ? 'deactivated' : 'activated'}.`)
  } catch {
    toast.error('Failed to update plan.')
  }
}
</script>

<template>
  <DashboardHeader title="Meal Plans" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Header row -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-muted-foreground">
        Configure meal plan tiers available for guests. Active plans appear as options on bookings.
      </p>
      <Button @click="openCreate">
        <Plus class="size-4 mr-2" />
        New Meal Plan
      </Button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 4" :key="i" class="h-48 rounded-xl bg-muted animate-pulse" />
    </div>

    <!-- Empty -->
    <div v-else-if="store.plans.length === 0" class="py-24 text-center text-muted-foreground">
      No meal plans configured yet. Add one to make it available on bookings.
    </div>

    <!-- Plan cards -->
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="plan in store.plans"
        :key="plan.id"
        :class="[
          'rounded-xl border bg-card p-5 flex flex-col gap-4 transition-opacity',
          !plan.is_active && 'opacity-60',
        ]"
      >
        <!-- Card header -->
        <div class="flex items-start justify-between gap-2">
          <div>
            <h3 class="font-semibold">{{ plan.name }}</h3>
            <p v-if="plan.description" class="text-xs text-muted-foreground mt-0.5 leading-relaxed">{{ plan.description }}</p>
          </div>
          <Badge :variant="plan.is_active ? 'default' : 'secondary'" class="shrink-0">
            {{ plan.is_active ? 'Active' : 'Inactive' }}
          </Badge>
        </div>

        <!-- Price -->
        <div class="rounded-lg bg-muted/50 px-4 py-3 text-center">
          <p class="text-2xl font-bold">
            ZMW {{ plan.price_per_person_per_night.toLocaleString() }}
          </p>
          <p class="text-xs text-muted-foreground mt-0.5">per person / per night</p>
        </div>

        <!-- Included meals -->
        <div>
          <p class="text-xs font-medium text-muted-foreground mb-2">Includes</p>
          <div v-if="plan.includes.length > 0" class="flex flex-wrap gap-1.5">
            <Badge v-for="item in plan.includes" :key="item" variant="outline" class="text-xs">
              {{ item }}
            </Badge>
          </div>
          <p v-else class="text-xs text-muted-foreground italic">No meals included</p>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between pt-2 border-t mt-auto">
          <button
            type="button"
            :class="[
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              plan.is_active ? 'bg-primary' : 'bg-input',
            ]"
            :title="plan.is_active ? 'Deactivate' : 'Activate'"
            @click="toggleActive(plan)"
          >
            <span
              :class="[
                'pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform',
                plan.is_active ? 'translate-x-4' : 'translate-x-0',
              ]"
            />
          </button>
          <div class="flex gap-1">
            <Button variant="ghost" size="icon" class="size-8" @click="openEdit(plan)">
              <Pencil class="size-4" />
            </Button>
            <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="confirmDelete(plan)">
              <Trash2 class="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <MealPlanDialog
    v-model:open="dialogOpen"
    :plan="selectedPlan"
    @saved="dialogOpen = false"
  />

  <Dialog v-model:open="deleteDialogOpen">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete Meal Plan</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete <strong>{{ planToDelete?.name }}</strong>?
          Any bookings using this plan will retain their current meal cost.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="deleting" @click="deleteDialogOpen = false">Cancel</Button>
        <Button variant="destructive" :disabled="deleting" @click="handleDelete">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
