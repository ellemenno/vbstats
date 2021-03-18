import { writable } from 'svelte/store';

export const match = writable({venue:'', date:'', sets:[]}); // array of sets .. array of rallies .. array of contacts
