<script setup lang="ts">
import { arrayMirrorSubscribeListener } from '@bzr/bazaar'
import { reactive, ref, computed, onMounted } from 'vue'
import type { Reactive, Ref } from 'vue'
import { useBzrStore } from '@/stores/bzr.ts'

import ModalDialog from '@/components/Modal.vue'

const newMeeting: Ref<Omit<Meeting, "id"> | null> = ref(null)
const newItem: Ref<Omit<Item, "id"> | null> = ref(null)

const store = useBzrStore()

const items: Reactive<Map<string | null, Map<string, Item>>> = reactive(
  new Map<string | null, Map<string, Item>>(),
)

const meetingsRaw: Ref<Meeting[]> = ref([])
const meetings = computed(() => [...meetingsRaw.value].sort((a, b) => a.date - b.date))

const itemsCollection = store.bzr.collection<Item>('items')
const meetingsCollection = store.bzr.collection<Meeting>('meetings')

onMounted(async () => {
  await meetingsCollection.subscribeAll({}, arrayMirrorSubscribeListener(meetingsRaw.value))
  await itemsCollection.subscribeAll(
    {},
    {
      onInitial: (item) => {
        const meetingId = item.meeting || null
        if (!items.has(meetingId)) {
          items.set(meetingId, new Map<string, Item>())
        }
        items.get(meetingId)?.set(item.id, item)
      },
      onAdd: (item) => {
        const meetingId = item.meeting || null
        if (!items.has(meetingId)) {
          items.set(meetingId, new Map<string, Item>())
        }
        items.get(meetingId)?.set(item.id, item)
      },
      onChange: (oldItem, newItem) => {
        const oldMeetingId = oldItem.meeting || null
        const newMeetingId = newItem.meeting || null

        items.get(oldMeetingId)?.delete(oldItem.id)

        if (!items.has(newMeetingId)) {
          items.set(newMeetingId, new Map<string, Item>())
        }
        items.get(newMeetingId)?.set(newItem.id, newItem)
      },
      onDelete: (item) => {
        const meetingId = item.meeting || null
        items.get(meetingId)?.delete(item.id)
      },
    },
  )
})

type Item = {
  id: string
  title: string
  description: string
  time_estimate?: number
  completed: boolean
  meeting?: string | null
}

type Meeting = {
  id: string
  title: string
  subtitle?: string
  date: number
}

async function onSubmit() {
  {
    let item: Ref<Omit<Item, "id">> = <Ref<Omit<Item, "id">>>newItem;
    await itemsCollection.insertOne(item.value)
  }

  newItem.value = null
}

async function assignToMeeting(item: Item, meetingId: string | null ) {
  await itemsCollection.updateOne(item.id, { meeting: meetingId })
}

async function toggleComplete(item: Item) {
  await itemsCollection.updateOne(item.id, { completed: !item.completed })
}

async function deleteItem(item: Item) {
  await itemsCollection.deleteOne(item.id)
}

async function deleteMeeting(meeting: Meeting) {
  await itemsCollection.deleteAll({ meeting: meeting.id })
  await meetingsCollection.deleteOne(meeting.id)
}

async function addMeeting() {
  if (newMeeting != null) {
    {
      let meeting: Ref<Omit<Meeting, "id">> = <Ref<Omit<Meeting, "id">>>newMeeting;
      meeting.value.date = new Date(meeting.value.date).valueOf()
      await meetingsCollection.insertOne(meeting.value)
    }

    newMeeting.value = null
  }
}
</script>

<template>
  <main>
    <div>
      <div class="card" id="new-items">
        <button @click="newItem = { title: '', description: '', completed: false }">Add</button>
        <h1>Unassigned Items</h1>
        <ul class="items" v-if="items.has(null)">
          <template v-for="item in items.get(null)?.values()" :key="item.id">
            <li>
              <a @click="toggleComplete(item)" v-bind:class="{ completed: item.completed }">{{
                item.title
              }}</a>
              <span>{{ item.time_estimate }} min.</span>
              <button @click="deleteItem(item)">X</button>
            </li>
            <li>
              <select :value="item.meeting" @change="assignToMeeting(item, (<HTMLTextAreaElement>$event.target).value)">
                <option value="" disabled selected hidden>Assign to...</option>
                <option :value="meeting.id" v-for="meeting in meetings" :key="meeting.id">
                  {{ new Date(meeting.date).toLocaleString() }} - {{ meeting.title }}
                </option>
              </select>
            </li>
          </template>
        </ul>
        <p v-else><em>Your list is empty</em></p>
      </div>
      <div>
        <button @click="newMeeting = { title: '', date: 0}">+ Meeting</button>
      </div>
      <div class="card" v-for="meeting in meetings" :key="meeting.id">
        <li>
          <a
            ><h1>{{ meeting.title }}</h1></a
          >
          <button @click="deleteMeeting(meeting)">X</button>
        </li>
        <h2 v-if="meeting.subtitle">{{ meeting.subtitle }}</h2>
        <time>{{ new Date(meeting.date).toLocaleString() }}</time>
        <h3>Agenda</h3>
        <ul v-if="items.has(meeting.id)" class="items">
          <li v-for="item in items.get(meeting.id)?.values()" :key="item.id">
            <a @click="toggleComplete(item)" v-bind:class="{ completed: item.completed }">{{
              item.title
            }}</a>
            <button @click="assignToMeeting(item, null)">X</button>
          </li>
        </ul>
      </div>
    </div>
  </main>

  <ModalDialog v-if="newMeeting !== null" closeText="Create Meeting" @close="newMeeting = null">
    <template v-slot:header>
      <h1>New Meeting</h1>
    </template>
    <template v-slot:body>
      <form @submit.prevent="addMeeting">
        <input type="text" v-model="newMeeting.title" placeholder="Title" required />
        <input type="text" v-model="newMeeting.subtitle" placeholder="Subtitle (optional)" />
        <input type="datetime-local" v-model="newMeeting.date" required />
        <button type="submit">Create Meeting</button>
      </form>
    </template>
  </ModalDialog>
  <ModalDialog v-if="newItem !== null" closeText="New Item" @close="newItem = null">
    <template v-slot:header>
      <h1>New Item</h1>
    </template>
    <template v-slot:body>
      <form class="item-form" @submit.prevent="onSubmit">
        <input type="text" v-model="newItem.title" placeholder="Title" required />
        <textarea v-model="newItem.description" placeholder="Description" required />
        <input
          type="number"
          v-model="newItem.time_estimate"
          placeholder="Estimated time in minutes"
        />
        <button type="submit">Add</button>
      </form>
    </template>
  </ModalDialog>
</template>

<style scoped>
main > div {
  display: flex;
  flex-direction: row;
  height: 100%;
  width: fit-content;
  div {
    margin: auto 10px;
    padding: 2rem;
    &.card {
      height: calc(100% - 20px);
      width: 500px;
      border: 2px solid #eee;
      border-radius: 0.25rem;
      box-shadow: 5px 5px 10px #999;
    }
  }
}

ul {
  list-style: none;
  padding: 0;
}

li {
  cursor: pointer;
  display: flex;
  flex-direction: row;
}

a,
label,
span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 1.3rem;
  line-height: 4rem;
}

a,
label {
  flex-grow: 4;
}

.completed {
  text-decoration: line-through;
}

input[type='checkbox'] {
  display: none;
}

li button {
  font-style: italic;
  margin-left: 1em;
  border: none;
  background: none;
  cursor: pointer;
  color: red;
}

select {
  width: 100%;
  height: 3rem;
  font-size: 1.3rem;
  padding: 0 1rem;
  background-color: inherit;
  border: 1px solid black;
  border-radius: 3px;
}
</style>
