import { useEffect, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "/api";

function App() {
  // Mode: "student" or "organizer"
  const [userType, setUserType] = useState("student");

  // Data states
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Student portal states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regForm, setRegForm] = useState({
    name: "",
    email: "",
    college: "",
    department: "",
    phone: "",
  });
  const [regStatusResult, setRegStatusResult] = useState(null); // { type: 'success'|'error', message: '' }

  // Student check-registration lookup
  const [studentLookupEmail, setStudentLookupEmail] = useState("");
  const [myRegistrations, setMyRegistrations] = useState(null);
  const [searchingBookings, setSearchingBookings] = useState(false);

  // Organizer portal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEventForViewRegs, setSelectedEventForViewRegs] = useState(null);
  const [eventRegistrations, setEventRegistrations] = useState([]);
  const [loadingEventRegs, setLoadingEventRegs] = useState(false);

  // New Event Form State with all required fields
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    venue: "",
    college: "",
    date: "",
    time: "",
    maxSeats: 100,
    registrationCloseTime: "",
    organizerPersonName: "",
    organizerEmail: "",
    organizationName: "",
    organizerCollege: "",
  });

  useEffect(() => {
    loadAllData();
  }, []);

  function showToast(msg, type = "success") {
    setNotification({ msg, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  }

  async function loadAllData() {
    try {
      setLoading(true);
      const [eventsRes, regRes] = await Promise.all([
        fetch(`${API}/events`),
        fetch(`${API}/registrations`),
      ]);

      if (!eventsRes.ok) throw new Error("Could not fetch events");

      const eventsData = await eventsRes.json();
      const regData = regRes.ok ? await regRes.json() : [];

      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setRegistrations(Array.isArray(regData) ? regData : []);
    } catch (err) {
      console.error(err);
      showToast("Cannot connect to backend server. Make sure it is running.", "error");
    } finally {
      setLoading(false);
    }
  }

  // Search Events
  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      return loadAllData();
    }
    try {
      setLoading(true);
      const res = await fetch(`${API}/events/search?title=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      showToast("Error searching events", "error");
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // STUDENT WORKFLOW: REGISTER FOR EVENT
  // ==========================================
  async function handleStudentRegister(e) {
    e.preventDefault();
    setRegStatusResult(null);

    if (!selectedEvent) return;
    if (!regForm.name.trim() || !regForm.email.trim() || !regForm.college.trim()) {
      setRegStatusResult({
        type: "error",
        message: "Please fill in all required fields (Name, Email, College).",
      });
      return;
    }

    try {
      const payload = {
        event: { id: selectedEvent.id },
        student: {
          name: regForm.name.trim(),
          email: regForm.email.trim().toLowerCase(),
          college: regForm.college.trim(),
          department: regForm.department ? regForm.department.trim() : "",
          phone: regForm.phone ? regForm.phone.trim() : "",
        },
      };

      const res = await fetch(`${API}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = "Registration failed.";
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.message || errText;
        } catch {
          errMsg = errText || "Registration failed.";
        }

        // Show error branch (Already Registered / Limit reached / Deadline closed)
        setRegStatusResult({
          type: "error",
          message: errMsg,
        });
        return;
      }

      const regData = await res.json();
      setRegStatusResult({
        type: "success",
        message: `🎉 Registration confirmed! Booking ID: #${regData.id}. We look forward to seeing you at ${selectedEvent.title}.`,
      });

      // Clear form & reload
      setRegForm({ name: "", email: "", college: "", department: "", phone: "" });
      loadAllData();
    } catch (err) {
      setRegStatusResult({
        type: "error",
        message: err.message || "Failed to communicate with server.",
      });
    }
  }

  // Student check registrations
  async function handleLookupMyRegistrations(e) {
    if (e) e.preventDefault();
    if (!studentLookupEmail.trim()) return;

    try {
      setSearchingBookings(true);
      const studentRes = await fetch(`${API}/students/email/${encodeURIComponent(studentLookupEmail.trim().toLowerCase())}`);
      if (!studentRes.ok) {
        setMyRegistrations([]);
        showToast("No registrations found for this email address.", "error");
        return;
      }
      const student = await studentRes.json();
      const myRegs = await fetch(`${API}/registrations/student/${student.id}`);
      if (myRegs.ok) {
        const data = await myRegs.json();
        setMyRegistrations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      showToast("Error retrieving your registrations", "error");
    } finally {
      setSearchingBookings(false);
    }
  }

  // Student cancel registration
  async function handleStudentCancelRegistration(regId) {
    if (!window.confirm("Are you sure you want to cancel your event registration? Your seat will be freed immediately.")) {
      return;
    }
    try {
      const res = await fetch(`${API}/registrations/${regId}/cancel`, {
        method: "PUT",
      });
      if (res.ok) {
        showToast("Your registration has been cancelled successfully. Seat freed up!");
        loadAllData();
        if (studentLookupEmail.trim()) {
          handleLookupMyRegistrations();
        }
      } else {
        const err = await res.text();
        showToast(err || "Failed to cancel registration.", "error");
      }
    } catch (err) {
      showToast("Error cancelling registration.", "error");
    }
  }

  // ==========================================
  // ORGANIZER WORKFLOW: CREATE EVENT
  // ==========================================
  async function handleCreateEvent(e) {
    e.preventDefault();

    if (!newEvent.title.trim() || !newEvent.date || !newEvent.venue.trim() || !newEvent.organizerEmail.trim()) {
      showToast("Please fill in the required event and organizer details", "error");
      return;
    }

    try {
      const payload = {
        title: newEvent.title.trim(),
        description: newEvent.description.trim(),
        venue: newEvent.venue.trim(),
        college: newEvent.college.trim() || newEvent.organizerCollege.trim(),
        date: newEvent.date,
        time: newEvent.time.trim() || "10:00 AM",
        maxSeats: parseInt(newEvent.maxSeats, 10) || 100,
        registrationCloseTime: newEvent.registrationCloseTime ? `${newEvent.registrationCloseTime}:00` : null,
        organizer: {
          name: newEvent.organizationName.trim() || newEvent.organizerPersonName.trim() || "Organizer",
          personName: newEvent.organizerPersonName.trim(),
          email: newEvent.organizerEmail.trim().toLowerCase(),
          college: newEvent.organizerCollege.trim() || newEvent.college.trim(),
        },
      };

      const res = await fetch(`${API}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to create event");
      }

      showToast("✅ Event stored successfully! Now visible to students.");
      setShowCreateModal(false);
      setNewEvent({
        title: "",
        description: "",
        venue: "",
        college: "",
        date: "",
        time: "",
        maxSeats: 100,
        registrationCloseTime: "",
        organizerPersonName: "",
        organizerEmail: "",
        organizationName: "",
        organizerCollege: "",
      });
      loadAllData();
    } catch (err) {
      showToast(err.message || "Failed to create event", "error");
    }
  }

  // Organizer: View Registrations for a specific event
  async function handleViewEventRegistrations(event) {
    setSelectedEventForViewRegs(event);
    setLoadingEventRegs(true);
    try {
      const res = await fetch(`${API}/registrations/event/${event.id}`);
      if (res.ok) {
        const data = await res.json();
        setEventRegistrations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      showToast("Failed to fetch registrations for this event", "error");
    } finally {
      setLoadingEventRegs(false);
    }
  }

  // Organizer: Delete Event
  async function handleDeleteEvent(id) {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    try {
      const res = await fetch(`${API}/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Event removed successfully.");
        loadAllData();
      } else {
        showToast("Failed to delete event", "error");
      }
    } catch (err) {
      showToast("Error deleting event", "error");
    }
  }

  // Count registrations for an event
  function getEventRegCount(eventId) {
    return registrations.filter((r) => r.event?.id === eventId && r.status === "REGISTERED").length;
  }

  // Check if an event's registration is closed
  function isEventClosed(event) {
    if (!event.registrationCloseTime) return false;
    return new Date() > new Date(event.registrationCloseTime);
  }

  return (
    <div className="app">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo" onClick={() => loadAllData()} style={{ cursor: "pointer" }}>
          <span className="logo-icon">E</span>
          <span>EventEase</span>
        </div>

        {/* ROLE SELECTOR NAVIGATION */}
        <div className="role-switcher">
          <button
            className={`role-btn ${userType === "student" ? "active" : ""}`}
            onClick={() => {
              setUserType("student");
              setSelectedEvent(null);
            }}
          >
            🎓 Student Portal
          </button>
          <button
            className={`role-btn ${userType === "organizer" ? "active" : ""}`}
            onClick={() => {
              setUserType("organizer");
              setSelectedEvent(null);
            }}
          >
            🏢 Organizer Portal
          </button>
        </div>

        <div className="nav-actions">
          <button className="nav-button" onClick={loadAllData} title="Refresh live data">
            ↻ Refresh
          </button>
        </div>
      </nav>

      {/* TOAST BANNER */}
      {notification && (
        <div className={`toast-banner ${notification.type}`}>
          <span>{notification.type === "error" ? "⚠️" : "✅"}</span>
          <p>{notification.msg}</p>
          <button onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🎓 STUDENT PORTAL VIEW                                    */}
      {/* ========================================================= */}
      {userType === "student" && (
        <div className="student-view">
          {/* HERO BANNER */}
          <section className="portal-hero">
            <div className="portal-hero-content">
              <span className="badge">STUDENT PORTAL • CAMPUS EVENTS</span>
              <h1>
                Find Events. <br />
                <span>Register Instantly.</span>
              </h1>
              <p>
                Browse campus hackathons, symposiums, cultural fests, and workshops.
                Register with your Student Name, Email, and College, or manage your existing bookings.
              </p>

              {/* SEARCH BOX */}
              <form onSubmit={handleSearch} className="hero-search-form">
                <input
                  type="text"
                  placeholder="Search events by title, topic, or venue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="primary-button">
                  🔍 Search Events
                </button>
                {searchQuery && (
                  <button
                    type="button"
                    className="clear-btn"
                    onClick={() => {
                      setSearchQuery("");
                      loadAllData();
                    }}
                  >
                    Clear
                  </button>
                )}
              </form>
            </div>

            <div className="portal-stats-cards">
              <div className="stat-card">
                <strong>{events.length}</strong>
                <span>Active Events</span>
              </div>
              <div className="stat-card">
                <strong>{registrations.length}</strong>
                <span>Total Registrations</span>
              </div>
            </div>
          </section>

          {/* EVENTS LIST */}
          <section className="section" id="events-list">
            <div className="section-heading">
              <div>
                <span className="section-label">UPCOMING CAMPUS EVENTS</span>
                <h2>Available Events ({events.length})</h2>
              </div>
            </div>

            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
                <p>Loading events from database...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📅</div>
                <h3>No events found</h3>
                <p>Switch to Organizer Portal to publish the first event!</p>
              </div>
            ) : (
              <div className="event-grid">
                {events.map((event) => {
                  const regCount = getEventRegCount(event.id);
                  const isFull = regCount >= event.maxSeats;
                  const closed = isEventClosed(event);

                  return (
                    <div className="event-card" key={event.id}>
                      <div className="event-top">
                        <span className={`event-tag ${closed ? "closed" : isFull ? "full" : ""}`}>
                          {closed ? "REGISTRATION CLOSED" : isFull ? "EVENT FULL" : "OPEN FOR REGISTRATION"}
                        </span>
                        <span className="event-id">#{event.id}</span>
                      </div>

                      <h3>{event.title}</h3>

                      {event.description && (
                        <p className="event-desc">{event.description}</p>
                      )}

                      <div className="event-details">
                        {event.college && (
                          <div>
                            <span>🏛️</span>
                            <p><strong>{event.college}</strong></p>
                          </div>
                        )}
                        <div>
                          <span>📅</span>
                          <p>{event.date} {event.time ? `at ${event.time}` : ""}</p>
                        </div>
                        <div>
                          <span>📍</span>
                          <p>{event.venue}</p>
                        </div>
                        <div>
                          <span>👥</span>
                          <p>
                            <strong>{regCount}</strong> / {event.maxSeats} seats registered
                          </p>
                        </div>
                        {event.registrationCloseTime && (
                          <div>
                            <span>⏳</span>
                            <p className="deadline-text">
                              Closes: {new Date(event.registrationCloseTime).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {event.organizer && (
                          <div>
                            <span>🏢</span>
                            <p>By {event.organizer.name} {event.organizer.personName ? `(${event.organizer.personName})` : ""}</p>
                          </div>
                        )}
                      </div>

                      <button
                        className={`register-button ${closed || isFull ? "disabled" : ""}`}
                        onClick={() => {
                          setSelectedEvent(event);
                          setRegStatusResult(null);
                          setShowRegisterModal(true);
                        }}
                      >
                        {closed ? "Registration Closed" : isFull ? "Event Full" : "View Details & Register →"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* MY REGISTRATIONS LOOKUP WITH CANCELLATION */}
          <section className="section dark-section" id="my-registrations">
            <div className="section-heading">
              <div>
                <span className="section-label">STUDENT DASHBOARD</span>
                <h2>Check or Cancel My Registrations</h2>
                <p style={{ color: "#64748b", marginTop: "6px" }}>
                  Already registered? Enter your email to view your booking pass, check status, or cancel a registration.
                </p>
              </div>
            </div>

            <form onSubmit={handleLookupMyRegistrations} className="lookup-form">
              <input
                type="email"
                required
                placeholder="Enter your student email (e.g. john@college.edu)"
                value={studentLookupEmail}
                onChange={(e) => setStudentLookupEmail(e.target.value)}
              />
              <button type="submit" className="primary-button" disabled={searchingBookings}>
                {searchingBookings ? "Searching..." : "Check My Bookings"}
              </button>
            </form>

            {myRegistrations !== null && (
              <div className="my-regs-result">
                {myRegistrations.length === 0 ? (
                  <p className="no-regs-text">No registrations found for {studentLookupEmail}.</p>
                ) : (
                  <div className="table-wrapper">
                    <table className="reg-table">
                      <thead>
                        <tr>
                          <th>Registration ID</th>
                          <th>Event Name</th>
                          <th>College & Venue</th>
                          <th>Date & Time</th>
                          <th>Booking Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myRegistrations.map((r) => (
                          <tr key={r.id}>
                            <td>#{r.id}</td>
                            <td><strong>{r.event?.title}</strong></td>
                            <td>{r.event?.college || "N/A"} • {r.event?.venue}</td>
                            <td>{r.event?.date} {r.event?.time}</td>
                            <td>
                              <span className={`status-tag ${r.status?.toLowerCase()}`}>
                                {r.status}
                              </span>
                            </td>
                            <td>
                              {r.status === "REGISTERED" ? (
                                <button
                                  className="btn-cancel"
                                  onClick={() => handleStudentCancelRegistration(r.id)}
                                  title="Cancel your registration and free your seat"
                                >
                                  Cancel Registration
                                </button>
                              ) : (
                                <span className="cancelled-note">Cancelled</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🏢 ORGANIZER PORTAL VIEW                                  */}
      {/* ========================================================= */}
      {userType === "organizer" && (
        <div className="organizer-view">
          {/* ORGANIZER HEADER */}
          <section className="portal-hero organizer-hero">
            <div className="portal-hero-content">
              <span className="badge">ORGANIZER CONSOLE • EVENT MANAGEMENT</span>
              <h1>
                Create Events. <br />
                <span>Track Registrations.</span>
              </h1>
              <p>
                Publish new college events with venue, timing, deadlines, and registration limits.
                Manage your events and monitor real-time student registrations.
              </p>
              <div className="hero-buttons">
                <button className="primary-button" onClick={() => setShowCreateModal(true)}>
                  + Create New Event
                </button>
              </div>
            </div>

            <div className="portal-stats-cards">
              <div className="stat-card">
                <strong>{events.length}</strong>
                <span>Managed Events</span>
              </div>
              <div className="stat-card">
                <strong>{registrations.length}</strong>
                <span>Participants Registered</span>
              </div>
            </div>
          </section>

          {/* MANAGE EVENTS TABLE */}
          <section className="section" id="manage-events">
            <div className="section-heading">
              <div>
                <span className="section-label">EVENT INVENTORY</span>
                <h2>Events Created ({events.length})</h2>
              </div>
              <button className="primary-button" onClick={() => setShowCreateModal(true)}>
                + Create Event
              </button>
            </div>

            {events.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🏢</div>
                <h3>No events created yet</h3>
                <p>Click "+ Create Event" above to publish your first college event.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="reg-table">
                  <thead>
                    <tr>
                      <th>Event ID</th>
                      <th>Event Title</th>
                      <th>Organizer Person & Email</th>
                      <th>College & Venue</th>
                      <th>Date & Time</th>
                      <th>Seats & Deadline</th>
                      <th>Registrations</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => {
                      const regCount = getEventRegCount(event.id);
                      const closed = isEventClosed(event);

                      return (
                        <tr key={event.id}>
                          <td>#{event.id}</td>
                          <td>
                            <strong>{event.title}</strong>
                            {event.description && (
                              <div className="table-sub">{event.description.slice(0, 45)}...</div>
                            )}
                          </td>
                          <td>
                            <strong>{event.organizer?.personName || event.organizer?.name || "Organizer"}</strong>
                            <div className="table-sub">{event.organizer?.email}</div>
                            {event.organizer?.name && (
                              <div className="table-sub">Org: {event.organizer.name}</div>
                            )}
                          </td>
                          <td>
                            <strong>{event.college || event.organizer?.college || "Campus"}</strong>
                            <div className="table-sub">📍 {event.venue}</div>
                          </td>
                          <td>
                            <div>📅 {event.date}</div>
                            {event.time && <div className="table-sub">⏰ {event.time}</div>}
                          </td>
                          <td>
                            <div>👥 Limit: {event.maxSeats}</div>
                            {event.registrationCloseTime ? (
                              <div className={`table-sub ${closed ? "text-danger" : ""}`}>
                                ⏳ Close: {new Date(event.registrationCloseTime).toLocaleDateString()}
                              </div>
                            ) : (
                              <div className="table-sub">No close time</div>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn-view-regs"
                              onClick={() => handleViewEventRegistrations(event)}
                            >
                              📋 View ({regCount})
                            </button>
                          </td>
                          <td>
                            <button
                              className="btn-delete"
                              onClick={() => handleDeleteEvent(event.id)}
                              title="Delete Event"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: STUDENT REGISTER FOR EVENT                         */}
      {/* ========================================================= */}
      {showRegisterModal && selectedEvent && (
        <div className="modal-backdrop" onClick={() => setShowRegisterModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Register for Event</h3>
              <button className="close-btn" onClick={() => setShowRegisterModal(false)}>✕</button>
            </div>

            {/* EVENT DETAILS PREVIEW */}
            <div className="reg-event-preview">
              <span className="badge">EVENT DETAILS</span>
              <h4 style={{ fontSize: "18px", marginTop: "4px", color: "#0369a1" }}>{selectedEvent.title}</h4>
              {selectedEvent.description && (
                <p style={{ color: "#475569", fontSize: "13px", marginTop: "4px" }}>
                  {selectedEvent.description}
                </p>
              )}
              <div className="preview-meta">
                <div>🏛️ <strong>College:</strong> {selectedEvent.college || selectedEvent.organizer?.college || "Campus"}</div>
                <div>📍 <strong>Venue:</strong> {selectedEvent.venue}</div>
                <div>📅 <strong>Date & Time:</strong> {selectedEvent.date} {selectedEvent.time ? `at ${selectedEvent.time}` : ""}</div>
                <div>👥 <strong>Seats:</strong> {getEventRegCount(selectedEvent.id)} / {selectedEvent.maxSeats} Registered</div>
                {selectedEvent.registrationCloseTime && (
                  <div>⏳ <strong>Deadline:</strong> {new Date(selectedEvent.registrationCloseTime).toLocaleString()}</div>
                )}
                {selectedEvent.organizer && (
                  <div>🏢 <strong>Organizer:</strong> {selectedEvent.organizer.personName || selectedEvent.organizer.name} ({selectedEvent.organizer.email})</div>
                )}
              </div>
            </div>

            {/* STATUS RESULT / ERROR / SUCCESS */}
            {regStatusResult && (
              <div className={`status-result-box ${regStatusResult.type}`}>
                <span>{regStatusResult.type === "error" ? "❌ Error:" : "✅ Success:"}</span>
                <p>{regStatusResult.message}</p>
                {regStatusResult.message?.toLowerCase().includes("already registered") && (
                  <button
                    type="button"
                    className="btn-cancel"
                    style={{ marginTop: "10px", alignSelf: "flex-start" }}
                    onClick={async () => {
                      const studentEmail = regForm.email.trim().toLowerCase();
                      try {
                        const sRes = await fetch(`${API}/students/email/${encodeURIComponent(studentEmail)}`);
                        if (sRes.ok) {
                          const std = await sRes.json();
                          const regRes = await fetch(`${API}/registrations/student/${std.id}/event/${selectedEvent.id}`);
                          if (regRes.ok) {
                            const reg = await regRes.json();
                            await handleStudentCancelRegistration(reg.id);
                            setRegStatusResult({
                              type: "success",
                              message: "Your registration was cancelled. Your seat has been freed.",
                            });
                          }
                        }
                      } catch {
                        showToast("Could not cancel registration.", "error");
                      }
                    }}
                  >
                    Cancel Existing Booking
                  </button>
                )}
              </div>
            )}

            {/* REGISTRATION FORM */}
            <form onSubmit={handleStudentRegister}>
              <div className="form-group">
                <label>Student Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Student Email ID *</label>
                <input
                  type="email"
                  required
                  placeholder="Enter your email (e.g. student@college.edu)"
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Which College / University *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your college or university name"
                  value={regForm.college}
                  onChange={(e) => setRegForm({ ...regForm, college: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Department / Branch</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={regForm.department}
                    onChange={(e) => setRegForm({ ...regForm, department: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowRegisterModal(false)}>
                  Close
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isEventClosed(selectedEvent) || getEventRegCount(selectedEvent.id) >= selectedEvent.maxSeats}
                >
                  Confirm Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ORGANIZER CREATE EVENT                             */}
      {/* ========================================================= */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Event (Organizer Console)</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateEvent}>
              {/* ORGANIZER SECTION */}
              <div className="form-subheading">1. Organizer Information</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Organizer Person Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Sharma / Dr. Kumar"
                    value={newEvent.organizerPersonName}
                    onChange={(e) => setNewEvent({ ...newEvent, organizerPersonName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Organizer Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. alex@college.edu"
                    value={newEvent.organizerEmail}
                    onChange={(e) => setNewEvent({ ...newEvent, organizerEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Organizer / Organization Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Association for Computing Machinery / IEEE"
                    value={newEvent.organizationName}
                    onChange={(e) => setNewEvent({ ...newEvent, organizationName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Organizer College / University *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PSG College of Technology"
                    value={newEvent.organizerCollege}
                    onChange={(e) => setNewEvent({ ...newEvent, organizerCollege: e.target.value })}
                  />
                </div>
              </div>

              {/* EVENT SECTION */}
              <div className="form-subheading" style={{ marginTop: "18px" }}>2. Event Details</div>
              <div className="form-group">
                <label>Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Hackathon 2026"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Event Description</label>
                <textarea
                  rows="3"
                  placeholder="Brief description of the event topics, schedule, prizes, etc."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Event Venue *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Auditorium, Seminar Hall 3"
                    value={newEvent.venue}
                    onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Host College Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Same as organizer college"
                    value={newEvent.college}
                    onChange={(e) => setNewEvent({ ...newEvent, college: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Event Date *</label>
                  <input
                    type="date"
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Event Time (e.g. 10:00 AM)</label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM - 04:00 PM"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Registration Limit (Max Seats) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="100"
                    value={newEvent.maxSeats}
                    onChange={(e) => setNewEvent({ ...newEvent, maxSeats: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Registration Close Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newEvent.registrationCloseTime}
                    onChange={(e) => setNewEvent({ ...newEvent, registrationCloseTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save Event to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ORGANIZER VIEW EVENT REGISTRATIONS                 */}
      {/* ========================================================= */}
      {selectedEventForViewRegs && (
        <div className="modal-backdrop" onClick={() => setSelectedEventForViewRegs(null)}>
          <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Registered Participants</h3>
                <p style={{ color: "#64748b", fontSize: "14px" }}>
                  {selectedEventForViewRegs.title} ({eventRegistrations.length} students)
                </p>
              </div>
              <button className="close-btn" onClick={() => setSelectedEventForViewRegs(null)}>✕</button>
            </div>

            {loadingEventRegs ? (
              <div className="loading">
                <div className="spinner"></div>
                <p>Loading participants...</p>
              </div>
            ) : eventRegistrations.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🎟️</div>
                <h3>No registrations yet</h3>
                <p>When students register for this event, their details will appear here.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="reg-table">
                  <thead>
                    <tr>
                      <th>Reg ID</th>
                      <th>Student Name</th>
                      <th>Email</th>
                      <th>College</th>
                      <th>Department</th>
                      <th>Phone</th>
                      <th>Registration Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventRegistrations.map((r) => (
                      <tr key={r.id}>
                        <td>#{r.id}</td>
                        <td><strong>{r.student?.name}</strong></td>
                        <td>{r.student?.email}</td>
                        <td>{r.student?.college || "N/A"}</td>
                        <td>{r.student?.department || "N/A"}</td>
                        <td>{r.student?.phone || "N/A"}</td>
                        <td>{r.registrationDate ? new Date(r.registrationDate).toLocaleDateString() : "N/A"}</td>
                        <td>
                          <span className={`status-tag ${r.status?.toLowerCase()}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setSelectedEventForViewRegs(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer>
        <div className="footer-logo">
          <span className="logo-icon">E</span>
          EventEase
        </div>
        <p>Campus Event Management & Registration Platform</p>
        <span>© 2026 EventEase</span>
      </footer>
    </div>
  );
}

export default App;