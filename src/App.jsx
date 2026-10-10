
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

export default function App() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
const [myRegistrations, setMyRegistrations] = useState([])
const [registrationsLoading, setRegistrationsLoading] = useState(false)
const [registrationsError, setRegistrationsError] = useState('')

  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  
const [registrationMessage, setRegistrationMessage] = useState('')
const [registeringSessionId, setRegisteringSessionId] = useState(null)

const [searchQuery, setSearchQuery] = useState('')
const [selectedCategory, setSelectedCategory] = useState('All')
const [seatCounts, setSeatCounts] = useState({})

  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])


  useEffect(() => {
    async function loadSessions() {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          title,
          speaker,
          category,
          start_time,
          end_time,
          capacity,
          status,
         rooms (
          name,
          capacity
        )
        `)
        .order('start_time', { ascending: true })

      if (error) {
        setError(error.message)
      } else {
        setSessions(data ?? [])
      }

      setLoading(false)
    }

    loadSessions()
  }, [])

  const scheduledSessions = sessions.filter(
    (session) => session.status === 'scheduled',
  )


const conflictsBySession = new Map()

for (let i = 0; i < scheduledSessions.length; i++) {
  for (let j = i + 1; j < scheduledSessions.length; j++) {
    const first = scheduledSessions[i]
    const second = scheduledSessions[j]

    const firstStart = new Date(first.start_time).getTime()
    const firstEnd = new Date(first.end_time).getTime()
    const secondStart = new Date(second.start_time).getTime()
    const secondEnd = new Date(second.end_time).getTime()

    if (firstStart < secondEnd && secondStart < firstEnd) {
      if (!conflictsBySession.has(first.id)) {
        conflictsBySession.set(first.id, [])
      }

      if (!conflictsBySession.has(second.id)) {
        conflictsBySession.set(second.id, [])
      }

      conflictsBySession.get(first.id).push(second.title)
      conflictsBySession.get(second.id).push(first.title)
    }
  }
}


  async function handleSignUp() {
    setAuthLoading(true)
    setAuthMessage('')

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      setAuthMessage(
        error
          ? error.message
          : 'Sign-up submitted. Check your email if confirmation is required.',
      )
    } catch {
      setAuthMessage('Something went wrong. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleLogin() {
    setAuthLoading(true)
    setAuthMessage('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      setAuthMessage(error ? error.message : 'Login successful!')
    } catch {
      setAuthMessage('Something went wrong. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    setAuthMessage(error ? error.message : 'Logged out successfully.')
  }


async function handleRegister(sessionId) {
  if (!user) {
    setRegistrationMessage('Please log in before registering.')
    return
  }

  setRegisteringSessionId(sessionId)
  setRegistrationMessage('')

  try {
    const { data, error } = await supabase.rpc(
      'register_for_session',
      { p_session_id: sessionId },
    )

    if (error) {
      setRegistrationMessage(error.message)
    } else {
      setRegistrationMessage(data)
await loadMyRegistrations()
    }
  } catch {
    setRegistrationMessage('Registration failed. Please try again.')
  } finally {
    setRegisteringSessionId(null)
  }
}


async function loadSeatCounts() {
  const { data, error } = await supabase.rpc(
    'get_session_seat_counts'
  )

  if (error) {
    console.error('Could not load seat counts:', error.message)
    return
  }

  const counts = {}

  for (const item of data ?? []) {
    counts[item.session_id] = {
      registered: Number(item.registered_count),
      available: Number(item.available_seats),
    }
  }

  setSeatCounts(counts)
}

async function handleCancelRegistration(registrationId) {
  if (!user) {
    setRegistrationsError('Please log in first.')
    return
  }

  const confirmed = window.confirm(
    'Are you sure you want to cancel this registration?'
  )

  if (!confirmed) return

  setRegistrationsError('')

  const { error } = await supabase
    .from('registrations')
    .delete()
    .eq('id', registrationId)
    .eq('participant_id', user.id)

  if (error) {
    setRegistrationsError(error.message)
    return
  }

  setMyRegistrations((previous) =>
    previous.filter((registration) => registration.id !== registrationId)
  )
}

async function loadMyRegistrations() {
  if (!user) {
    setMyRegistrations([])
    return
  }

  setRegistrationsLoading(true)
  setRegistrationsError('')

  try {
    const { data, error } = await supabase
      .from('registrations')
      .select(`
        id,
        registered_at,
        sessions (
          id,
          title,
          speaker,
          category,
          start_time,
          end_time,
          rooms (
            name
          )
        )
      `)
      .eq('participant_id', user.id)
      .order('registered_at', { ascending: false })

    if (error) {
      setRegistrationsError(error.message)
      setMyRegistrations([])
    } else {
      setMyRegistrations(data ?? [])
    }
  } catch {
    setRegistrationsError('Could not load your registrations.')
  } finally {
    setRegistrationsLoading(false)
  }
}



useEffect(() => {
  loadMyRegistrations()
  loadSeatCounts()
}, [user])


  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white md:px-10">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="font-bold tracking-wide text-teal-400">
            APEX · CONFERENCE PLANNER
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Smart scheduling for smarter events
          </p>
        </header>


<section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
  <h2 className="text-xl font-bold">Participant Account</h2>

  {user ? (
    <div className="mt-4">
      <p className="text-sm text-slate-300">
        Logged in as: {user.email}
      </p>

      <button
        onClick={handleLogout}
        className="mt-4 rounded-lg bg-slate-700 px-4 py-2 text-white"
      >
        Log out
      </button>
    </div>
  ) : (
    <div className="mt-4 grid gap-3 sm:max-w-md">
      <input
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
      />

      <input
        type="password"
        placeholder="Password (at least 6 characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white"
      />

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSignUp}
          disabled={authLoading || !email || password.length < 6}
          className="rounded-lg bg-teal-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
        >
          Sign up
        </button>

        <button
          onClick={handleLogin}
          disabled={authLoading || !email || !password}
          className="rounded-lg border border-slate-700 px-4 py-2 text-white disabled:opacity-50"
        >
          Log in
        </button>
      </div>
    </div>
  )}

  {authMessage && (
    <p className="mt-4 text-sm text-teal-300">{authMessage}</p>
  )}
</section>


        <section className="mt-12">
          <p className="text-sm font-medium text-teal-400">
            CONFERENCE OVERVIEW
          </p>
          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            Plan your day.
            <br />
            <span className="text-slate-400">Without the conflicts.</span>
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-400">
            Sessions are now loaded from your Supabase database.
          </p>
        </section>

<section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
  <h2 className="text-xl font-bold">My Registered Sessions</h2>
  <p className="mt-2 text-sm text-slate-400">
    Sessions booked using your participant account.
  </p>

  {registrationsLoading && (
    <p className="mt-4 text-slate-400">Loading your registrations...</p>
  )}

  {registrationsError && (
    <p className="mt-4 text-sm text-red-300">{registrationsError}</p>
  )}

  {!registrationsLoading &&
    !registrationsError &&
    myRegistrations.length === 0 && (
      <p className="mt-4 text-sm text-slate-400">
        You have not registered for any sessions yet.
      </p>
    )}

  <div className="mt-5 grid gap-4 md:grid-cols-2">
    {myRegistrations.map((registration) => {
      const session = registration.sessions

      if (!session) return null

      const formatTime = (value) =>
        new Date(value).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        })

      return (
        <article
          key={registration.id}
          className="rounded-xl border border-slate-800 p-4"
        >
          <p className="text-sm text-teal-300">{session.category}</p>
          <h3 className="mt-2 font-bold">{session.title}</h3>
          <p className="mt-2 text-sm text-slate-400">
            Speaker: {session.speaker}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {session.rooms?.name ?? 'Room not assigned'}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {formatTime(session.start_time)} – {formatTime(session.end_time)}
          </p>
          
<button
  onClick={() => handleCancelRegistration(registration.id)}
  className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
>
  Cancel Registration
</button>

        </article>
      )
    })}
  </div>
</section>

        <section className="mt-9 grid gap-4 sm:grid-cols-3">
          <Stat
            label="Total sessions"
            value={String(scheduledSessions.length).padStart(2, '0')}
          />
          <Stat
            label="Conference rooms"
            value={String(new Set(scheduledSessions.map(
              (session) => session.rooms?.name,
            )).size).padStart(2, '0')}
          />
          <Stat label="Database" value={loading ? 'Loading…' : error ? 'Error' : 'Connected'} />
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold">Upcoming sessions</h2>
          <p className="mt-2 text-sm text-slate-400">
            {loading ? 'Loading sessions…' : `${scheduledSessions.length} sessions found`}
          </p>

<div className="mb-6 grid gap-3 sm:grid-cols-2">
  <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search by session or speaker..."
    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-teal-400"
  />

  <select
    value={selectedCategory}
    onChange={(e) => setSelectedCategory(e.target.value)}
    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-teal-400"
  >
    <option value="All">All Categories</option>
    <option value="Artificial Intelligence">Artificial Intelligence</option>
    <option value="Development">Development</option>
    <option value="Cybersecurity">Cybersecurity</option>
  </select>
</div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-800 bg-red-950 p-4 text-red-200">
              Could not load sessions: {error}
              <p className="mt-2 text-sm">
                Check your Supabase URL, publishable key, table permissions, and database setup.
              </p>
            </div>
          )}

          {!loading && !error && scheduledSessions.length === 0 && (
            <p className="mt-5 rounded-xl border border-slate-800 p-5 text-slate-300">
              No scheduled sessions were found. Check your sessions table in Supabase.
            </p>
          )}

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            

{scheduledSessions
  .filter((session) => {
    const query = searchQuery.toLowerCase().trim()

    const matchesSearch =
      session.title.toLowerCase().includes(query) ||
      session.speaker.toLowerCase().includes(query)

    const matchesCategory =
      selectedCategory === 'All' ||
      session.category === selectedCategory

    return matchesSearch && matchesCategory
  })
  .map((session) => {

              const roomCapacity = session.rooms?.capacity
              const capacity = session.capacity
              const time = (value) =>
                new Date(value).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'Asia/Kolkata',
                })

              return (
                <article
                  key={session.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-teal-950 px-3 py-1 text-xs text-teal-300">
                      {session.category}
                    </span>
                    <span className="text-sm text-slate-400">
                      {session.rooms?.name ?? 'Room not assigned'}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-bold">{session.title}</h3>
                  

{conflictsBySession.has(session.id) && (
  <div className="mt-3 rounded-lg border border-amber-700 bg-amber-950 px-3 py-2 text-sm text-amber-300">
    <p className="font-semibold">⚠ Time conflict</p>
    <p className="mt-1">
      Overlaps with: {conflictsBySession.get(session.id).join(', ')}
    </p>
  </div>
)}


                  <p className="mt-2 text-sm text-slate-400">
                    Speaker: {session.speaker}
                  </p>
                  <p className="mt-5 text-sm">
                    {time(session.start_time)} – {time(session.end_time)}
                  </p>

                  <div className="mt-5 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Session capacity</span>
                    <span className="font-semibold">{capacity} seats</span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full w-0 rounded-full bg-teal-400" />
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    {roomCapacity
                      ? `Room capacity: ${roomCapacity} seats`
                      : 'Room capacity not available'}

                  </p>
       
<div className="mt-3 flex items-center justify-between text-xs">
  <span className="text-slate-400">
    Registered seats
  </span>
  <span className="font-semibold text-white">
    {seatCounts[session.id]?.registered ?? 0} / {capacity}
  </span>
</div>

<div className="mt-2 flex items-center justify-between text-xs">
  <span className="text-slate-400">
    Available seats
  </span>
  <span className="font-semibold text-teal-300">
    {seatCounts[session.id]?.available ?? capacity}
  </span>
</div>
           
<div className="mt-5">
  <button
    onClick={() => handleRegister(session.id)}
   
disabled={
  registeringSessionId === session.id ||
  (seatCounts[session.id]?.available ?? capacity) <= 0
}

    className="w-full rounded-lg bg-teal-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50"
  >
    
{registeringSessionId === session.id
  ? 'Registering...'
  : (seatCounts[session.id]?.available ?? capacity) <= 0
    ? 'Session Full'
    : 'Register for Session'}

  </button>
</div>

                </article>
              )
            })}
          </div>
        </section>


{registrationMessage && (
  <p className="mt-5 rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-teal-300">
    {registrationMessage}
  </p>
)}


        <footer className="mt-14 border-t border-slate-800 py-6 text-sm text-slate-500">
          APEX · Smart Conference Session Planner · Connected prototype
        </footer>
      </div>
    </main>
  )
}
