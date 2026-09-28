package com.example.Eventease.event.controller;

import com.example.Eventease.event.Event;
import com.example.Eventease.event.service.EventService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping
    public Event createEvent(@RequestBody Event event) {
        return eventService.createEvent(event);
    }

    @GetMapping
    public List<Event> getAllEvents() {
        return eventService.getAllEvents();
    }

    @GetMapping("/{id}")
    public Event getEventById(@PathVariable Long id) {
        return eventService.getEventById(id);
    }

    @GetMapping("/organizer/{organizerId}")
    public List<Event> getEventsByOrganizer(
            @PathVariable Long organizerId) {

        return eventService.getEventsByOrganizer(organizerId);
    }

    @GetMapping("/search")
    public List<Event> searchEvents(@RequestParam String title) {
        return eventService.searchEventsByTitle(title);
    }

    @GetMapping("/venue")
    public List<Event> getEventsByVenue(@RequestParam String venue) {
        return eventService.getEventsByVenue(venue);
    }

    @PutMapping("/{id}")
    public Event updateEvent(
            @PathVariable Long id,
            @RequestBody Event event) {

        return eventService.updateEvent(id, event);
    }

    @DeleteMapping("/{id}")
    public String deleteEvent(@PathVariable Long id) {
        eventService.deleteEvent(id);
        return "Event deleted successfully";
    }
}