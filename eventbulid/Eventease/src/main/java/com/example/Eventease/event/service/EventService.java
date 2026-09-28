package com.example.Eventease.event.service;

import com.example.Eventease.event.Event;
import com.example.Eventease.event.repository.EventRepository;
import com.example.Eventease.organizer.Organizer;
import com.example.Eventease.organizer.repository.OrganizerRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final OrganizerRepository organizerRepository;

    public EventService(EventRepository eventRepository, OrganizerRepository organizerRepository) {
        this.eventRepository = eventRepository;
        this.organizerRepository = organizerRepository;
    }

    public Event createEvent(Event event) {
        if (event.getOrganizer() == null) {
            throw new RuntimeException("Organizer information is required");
        }

        Organizer organizer;
        if (event.getOrganizer().getId() != null) {
            organizer = organizerRepository.findById(event.getOrganizer().getId())
                    .orElseThrow(() -> new RuntimeException("Organizer not found with ID: " + event.getOrganizer().getId()));
        } else if (event.getOrganizer().getEmail() != null && !event.getOrganizer().getEmail().trim().isEmpty()) {
            String email = event.getOrganizer().getEmail().trim().toLowerCase();
            String name = event.getOrganizer().getName();
            String personName = event.getOrganizer().getPersonName();
            String college = event.getOrganizer().getCollege();
            String phone = event.getOrganizer().getPhone();

            organizer = organizerRepository.findByEmail(email).map(existing -> {
                if (name != null && !name.trim().isEmpty()) existing.setName(name);
                if (personName != null && !personName.trim().isEmpty()) existing.setPersonName(personName);
                if (college != null && !college.trim().isEmpty()) existing.setCollege(college);
                if (phone != null && !phone.trim().isEmpty()) existing.setPhone(phone);
                return organizerRepository.save(existing);
            }).orElseGet(() -> {
                Organizer newOrg = Organizer.builder()
                        .name(name != null && !name.trim().isEmpty() ? name : (personName != null ? personName : "Organizer"))
                        .personName(personName != null ? personName : name)
                        .email(email)
                        .college(college)
                        .phone(phone)
                        .build();
                return organizerRepository.save(newOrg);
            });
        } else {
            throw new RuntimeException("Organizer Email or ID is required");
        }

        event.setOrganizer(organizer);

        if (event.getCollege() == null || event.getCollege().trim().isEmpty()) {
            event.setCollege(organizer.getCollege());
        }

        return eventRepository.save(event);
    }

    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    public Event getEventById(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found with ID: " + id));
    }

    public List<Event> getEventsByOrganizer(Long organizerId) {
        return eventRepository.findByOrganizerId(organizerId);
    }

    public List<Event> searchEventsByTitle(String title) {
        return eventRepository.findByTitleContainingIgnoreCase(title);
    }

    public List<Event> getEventsByVenue(String venue) {
        return eventRepository.findByVenue(venue);
    }

    public Event updateEvent(Long id, Event updatedEvent) {
        Event existingEvent = getEventById(id);

        existingEvent.setTitle(updatedEvent.getTitle());
        existingEvent.setDescription(updatedEvent.getDescription());
        existingEvent.setDate(updatedEvent.getDate());
        existingEvent.setTime(updatedEvent.getTime());
        existingEvent.setVenue(updatedEvent.getVenue());
        existingEvent.setCollege(updatedEvent.getCollege());
        existingEvent.setMaxSeats(updatedEvent.getMaxSeats());
        existingEvent.setRegistrationCloseTime(updatedEvent.getRegistrationCloseTime());

        return eventRepository.save(existingEvent);
    }

    public void deleteEvent(Long id) {
        if (!eventRepository.existsById(id)) {
            throw new RuntimeException("Event not found");
        }
        eventRepository.deleteById(id);
    }
}