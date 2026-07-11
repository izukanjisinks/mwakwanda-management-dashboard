<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useMealCardsStore } from '@/stores/mealCards'
import { useRoomsStore } from '@/stores/rooms'
import { mealCollection } from '@/services/api/meal-collection-adapter'
import { getApiError } from '@/utils/errors'
import { CARD_ROLES } from '@/constants/meals'
import type { MealCardAssignment, CardRole } from '@/types/meal-collection'
import type { BookingAttendee } from '@/types/booking'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

const props = defineProps<{
  open: boolean
  mode: 'assign' | 'edit' | 'reassign' | 'replace'
  roomId: string
  roomName?: string
  card?: MealCardAssignment | null   // required context for edit/reassign/replace; unused for assign
}>()
const emit = defineEmits<{ 'update:open': [boolean]; saved: [] }>()

const cardsStore = useMealCardsStore()
const roomsStore = useRoomsStore()

const cardUid = ref('')
const selectedAttendeeId = ref('none')   // sentinel — 'none' means "no occupant"
const selectedRole = ref<CardRole>('resident')
const selectedRoomId = ref('')           // reassign target
const reason = ref('')
const saving = ref(false)

// ── Checked-in guests for whichever room is currently relevant ───────────────
const guests = ref<BookingAttendee[]>([])
const guestsLoading = ref(false)

async function loadGuestsFor(roomId: string) {
  guests.value = []
  if (!roomId) return
  guestsLoading.value = true
  try {
    const stay = await mealCollection.getCurrentStay(roomId)
    guests.value = stay.attendees
  } catch {
    // A vacant room simply has no guests to offer — not an error state, the
    // card can still be registered/reassigned without an occupant.
  } finally {
    guestsLoading.value = false
  }
}

const showOccupantField = computed(() =>
  props.mode === 'assign' || props.mode === 'edit' || (props.mode === 'reassign' && selectedRoomId.value !== ''),
)
const showRoleField = computed(() => props.mode === 'assign' || props.mode === 'edit')

watch(() => props.open, (open) => {
  if (!open) return
  cardUid.value = ''
  reason.value = ''
  selectedRoomId.value = ''
  selectedAttendeeId.value = props.mode === 'edit' ? (props.card?.attendee_id ?? 'none') : 'none'
  selectedRole.value = props.mode === 'edit' ? (props.card?.role ?? 'resident') : 'resident'
  if (props.mode === 'assign' || props.mode === 'edit') loadGuestsFor(props.roomId)
  else guests.value = []
})

watch(selectedRoomId, (roomId) => {
  if (props.mode !== 'reassign') return
  selectedAttendeeId.value = 'none'
  loadGuestsFor(roomId)
})

const reassignRoomOptions = computed(() =>
  [...roomsStore.rooms].filter(r => r.id !== props.roomId).sort((a, b) => a.name.localeCompare(b.name)),
)

function idLabel(guest: BookingAttendee) {
  return guest.identification_card ? `ID: ${guest.identification_card}` : 'No ID on file'
}
function cardCountFor(attendeeId: string) {
  return cardsStore.cards.filter(c => c.attendee_id === attendeeId && c.status === 'active' && c.id !== props.card?.id).length
}
function guestOptionLabel(guest: BookingAttendee) {
  return `${guest.full_name} — ${idLabel(guest)}${cardCountFor(guest.id) > 0 ? ' (already has a card)' : ''}`
}

const canSubmit = computed(() => {
  if (props.mode === 'assign' || props.mode === 'replace') return cardUid.value.trim() !== ''
  if (props.mode === 'reassign') return selectedRoomId.value !== ''
  return true // edit
})

const titles: Record<typeof props.mode, string> = {
  assign: 'Register Card', edit: 'Edit Card', reassign: 'Reassign Card', replace: 'Replace Card',
}
const submitLabels: Record<typeof props.mode, string> = {
  assign: 'Register Card', edit: 'Save Changes', reassign: 'Reassign Card', replace: 'Replace Card',
}

async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    if (props.mode === 'assign') {
      await cardsStore.assignCard({
        card_uid: cardUid.value.trim(),
        room_id: props.roomId,
        role: selectedRole.value,
        attendee_id: selectedAttendeeId.value === 'none' ? undefined : selectedAttendeeId.value,
      })
      toast.success('Card registered.')
    } else if (props.mode === 'edit' && props.card) {
      await cardsStore.updateCard(props.card.id, {
        role: selectedRole.value,
        attendee_id: selectedAttendeeId.value === 'none' ? null : selectedAttendeeId.value,
      })
      toast.success('Card updated.')
    } else if (props.mode === 'reassign' && props.card) {
      await cardsStore.updateCard(props.card.id, {
        room_id: selectedRoomId.value,
        attendee_id: selectedAttendeeId.value === 'none' ? null : selectedAttendeeId.value,
      })
      toast.success('Card reassigned.')
    } else if (props.mode === 'replace' && props.card) {
      await cardsStore.replaceCard(props.card.id, { new_card_uid: cardUid.value.trim(), reason: reason.value.trim() || undefined })
      toast.success('Card replaced.')
    }
    emit('saved')
    emit('update:open', false)
  } catch (err) {
    toast.error(getApiError(err, 'Failed to save card.'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ titles[mode] }}</DialogTitle>
        <DialogDescription>
          <span v-if="mode === 'assign'">Link a new card to <strong>{{ roomName }}</strong>. Choose its role and, optionally, which checked-in guest holds it.</span>
          <span v-else-if="mode === 'edit'">Change the role or occupant for card <strong class="font-mono">{{ card?.card_uid }}</strong> in {{ roomName }}.</span>
          <span v-else-if="mode === 'reassign'">Move card <strong class="font-mono">{{ card?.card_uid }}</strong> from {{ roomName }} to a different room.</span>
          <span v-else>Issue a new card UID for <strong>{{ card?.holder_name ?? roomName }}</strong> — the old card ({{ card?.card_uid }}) will be voided.</span>
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <div v-if="mode === 'reassign'">
          <Label class="text-xs">New Room <span class="text-destructive">*</span></Label>
          <Select v-model="selectedRoomId">
            <SelectTrigger class="mt-1.5"><SelectValue placeholder="Select a room…" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="r in reassignRoomOptions" :key="r.id" :value="r.id">{{ r.name }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div v-if="mode === 'replace'">
          <Label class="text-xs">Current Card UID</Label>
          <p class="mt-1.5 text-sm font-mono text-muted-foreground">{{ card?.card_uid }}</p>
        </div>

        <div v-if="showRoleField">
          <Label class="text-xs">Role <span class="text-destructive">*</span></Label>
          <Select v-model="selectedRole">
            <SelectTrigger class="mt-1.5"><SelectValue placeholder="Select a role…" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="r in CARD_ROLES" :key="r.value" :value="r.value">{{ r.label }}</SelectItem>
            </SelectContent>
          </Select>
          <p class="mt-1.5 text-xs text-muted-foreground">
            {{ CARD_ROLES.find(r => r.value === selectedRole)?.can_collect_meals ? 'Can collect meals.' : "Can't collect meals." }}
          </p>
        </div>

        <div v-if="showOccupantField">
          <Label class="text-xs">Occupant</Label>
          <p v-if="guestsLoading" class="mt-1.5 text-xs text-muted-foreground">Loading checked-in guests…</p>
          <template v-else>
            <Select v-model="selectedAttendeeId">
              <SelectTrigger class="mt-1.5"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No occupant (room-only card)</SelectItem>
                <SelectItem v-for="g in guests" :key="g.id" :value="g.id">{{ guestOptionLabel(g) }}</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="guests.length === 0" class="mt-1.5 text-xs text-muted-foreground">No checked-in guests in this room right now.</p>
          </template>
        </div>

        <div v-if="mode === 'assign' || mode === 'replace'">
          <Label class="text-xs">{{ mode === 'replace' ? 'New Card UID' : 'Card UID' }} <span class="text-destructive">*</span></Label>
          <Input v-model="cardUid" placeholder="Scan or type the RFID card UID" class="mt-1.5 font-mono" />
        </div>

        <div v-if="mode === 'replace'">
          <Label class="text-xs">Reason</Label>
          <Textarea v-model="reason" placeholder="e.g. Lost card, damaged card" rows="2" class="mt-1.5" />
        </div>
      </div>

      <DialogFooter class="gap-2 mt-1">
        <Button variant="outline" :disabled="saving" @click="emit('update:open', false)">Cancel</Button>
        <Button :disabled="!canSubmit || saving" @click="submit">{{ submitLabels[mode] }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
