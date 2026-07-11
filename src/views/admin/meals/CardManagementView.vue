<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { IdCard, MoreHorizontal, Pencil, ArrowRightLeft, RefreshCw, Power, Ban, Plus, Search } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useMealCardsStore } from '@/stores/mealCards'
import { useRoomsStore } from '@/stores/rooms'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { getApiError } from '@/utils/errors'
import { CARD_ROLES } from '@/constants/meals'
import type { Room } from '@/types/room'
import type { MealCardAssignment, MealCardStatus } from '@/types/meal-collection'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import CardDialog from '@/components/meals/CardDialog.vue'

const cardsStore = useMealCardsStore()
const roomsStore = useRoomsStore()
const confirmDialog = useConfirmDialog()

onMounted(() => {
  roomsStore.fetchRooms(1, 200)
  cardsStore.fetchCards()
})

const search = ref('')
const filteredRooms = computed(() => {
  const rooms = [...roomsStore.rooms].sort((a, b) => a.name.localeCompare(b.name))
  const q = search.value.trim().toLowerCase()
  return q ? rooms.filter(r => r.name.toLowerCase().includes(q)) : rooms
})

// Only surface a room's "live" cards — void/replaced records are dead
// history, not part of current inventory.
function cardsForRoom(roomId: string): MealCardAssignment[] {
  return cardsStore.cards.filter(c => c.room_id === roomId && (c.status === 'active' || c.status === 'inactive'))
}

const statusConfig: Record<MealCardStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active:   { label: 'Active',   variant: 'secondary' },
  inactive: { label: 'Inactive', variant: 'outline' },
  replaced: { label: 'Replaced', variant: 'outline' },
  void:     { label: 'Void',     variant: 'outline' },
}

function roleLabel(card: MealCardAssignment) {
  return CARD_ROLES.find(r => r.value === card.role)?.label ?? card.role
}

// ── Dialog (register / edit occupant / reassign / replace) ───────────────────
const dialogOpen = ref(false)
const dialogMode = ref<'assign' | 'edit' | 'reassign' | 'replace'>('assign')
const dialogRoom = ref<Room | null>(null)
const dialogCard = ref<MealCardAssignment | null>(null)

function openDialog(mode: typeof dialogMode.value, room: Room, card: MealCardAssignment | null) {
  dialogMode.value = mode
  dialogRoom.value = room
  dialogCard.value = card
  dialogOpen.value = true
}

// ── Activate / deactivate toggle ──────────────────────────────────────────────
const togglingId = ref<string | null>(null)

async function toggleActive(card: MealCardAssignment) {
  togglingId.value = card.id
  try {
    const nextStatus = card.status === 'active' ? 'inactive' : 'active'
    await cardsStore.updateCard(card.id, { status: nextStatus })
    toast.success(nextStatus === 'active' ? 'Card activated.' : 'Card deactivated.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to update card status.'))
  } finally {
    togglingId.value = null
  }
}

// ── Void ─────────────────────────────────────────────────────────────────────
const voidingId = ref<string | null>(null)

async function voidCard(card: MealCardAssignment) {
  const confirmed = await confirmDialog.confirm({
    title: 'Void this card?',
    description: `Card ${card.card_uid}${card.holder_name ? ` — ${card.holder_name}` : ''} (${card.room_name}) will no longer work anywhere. This cannot be undone.`,
    confirmText: 'Void Card',
    variant: 'destructive',
  })
  if (!confirmed) return
  voidingId.value = card.id
  try {
    await cardsStore.voidCard(card.id)
    toast.success('Card voided.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to void card.'))
  } finally {
    voidingId.value = null
  }
}
</script>

<template>
  <DashboardHeader title="Card Management" />

  <div class="flex flex-col gap-6 p-6">
    <div class="relative w-full max-w-xs">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input v-model="search" placeholder="Search rooms…" class="pl-9" />
    </div>

    <div class="rounded-xl border bg-card overflow-hidden">
      <div v-if="roomsStore.loading || cardsStore.cardsLoading" class="flex flex-col gap-2 p-4">
        <div v-for="i in 5" :key="i" class="h-12 rounded-lg bg-muted animate-pulse" />
      </div>

      <div v-else-if="cardsStore.cardsError" class="flex flex-col items-center justify-center py-24 text-center gap-3">
        <p class="text-destructive text-sm">{{ cardsStore.cardsError }}</p>
        <Button variant="outline" size="sm" @click="cardsStore.fetchCards()">Try Again</Button>
      </div>

      <div v-else-if="filteredRooms.length === 0" class="flex flex-col items-center justify-center py-24 text-center gap-3">
        <IdCard class="size-10 text-muted-foreground/40" />
        <p class="text-muted-foreground">No rooms found.</p>
      </div>

      <Table v-else>
        <TableHeader>
          <TableRow class="bg-muted/30">
            <TableHead>Room</TableHead>
            <TableHead>Cards</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="room in filteredRooms" :key="room.id">
            <TableCell class="align-top py-3">
              <p class="font-medium text-sm">{{ room.name }}</p>
              <p class="text-xs text-muted-foreground">
                {{ cardsForRoom(room.id).length }} card{{ cardsForRoom(room.id).length !== 1 ? 's' : '' }} registered
              </p>
            </TableCell>
            <TableCell class="align-top py-3">
              <div v-if="cardsForRoom(room.id).length === 0" class="text-sm text-muted-foreground">No cards registered</div>
              <div v-else class="flex flex-col gap-2 items-start">
                <div
                  v-for="card in cardsForRoom(room.id)" :key="card.id"
                  class="flex items-center gap-2 rounded-lg border bg-muted/30 pl-3 pr-1.5 py-1.5"
                >
                  <span class="text-sm font-medium w-28 truncate shrink-0">
                    {{ card.holder_name ?? 'No occupant' }}
                  </span>
                  <Badge variant="secondary" class="font-mono">
                    <IdCard class="size-3 mr-1" /> {{ card.card_uid }}
                  </Badge>
                  <Badge variant="outline">{{ roleLabel(card) }}</Badge>
                  <Badge :variant="statusConfig[card.status].variant">{{ statusConfig[card.status].label }}</Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button size="icon" variant="outline" class="size-7 shrink-0 bg-background">
                        <MoreHorizontal class="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem class="cursor-pointer" @click="openDialog('edit', room, card)">
                        <Pencil class="size-3.5" /> Edit Card
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        class="cursor-pointer"
                        :disabled="togglingId === card.id"
                        @click="toggleActive(card)"
                      >
                        <Power class="size-3.5" /> {{ card.status === 'active' ? 'Deactivate' : 'Activate' }}
                      </DropdownMenuItem>
                      <DropdownMenuItem class="cursor-pointer" @click="openDialog('reassign', room, card)">
                        <ArrowRightLeft class="size-3.5" /> Reassign to Another Room
                      </DropdownMenuItem>
                      <DropdownMenuItem class="cursor-pointer" @click="openDialog('replace', room, card)">
                        <RefreshCw class="size-3.5" /> Replace Card
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        class="cursor-pointer text-destructive focus:text-destructive"
                        :disabled="voidingId === card.id"
                        @click="voidCard(card)"
                      >
                        <Ban class="size-3.5" /> Void Card
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </TableCell>
            <TableCell class="text-right align-top py-3">
              <Button size="sm" variant="outline" @click="openDialog('assign', room, null)">
                <Plus class="size-3.5 mr-1" /> Register Card
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>

  <CardDialog
    v-if="dialogRoom"
    :open="dialogOpen"
    :mode="dialogMode"
    :room-id="dialogRoom.id"
    :room-name="dialogRoom.name"
    :card="dialogCard"
    @update:open="dialogOpen = $event"
  />
</template>
