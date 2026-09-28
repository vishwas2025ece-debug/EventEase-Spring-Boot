package com.example.Eventease.organizer.controller;

import com.example.Eventease.organizer.Organizer;
import com.example.Eventease.organizer.service.OrganizerService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/organizers")
public class OrganizerController {

    private final OrganizerService organizerService;

    public OrganizerController(OrganizerService organizerService) {
        this.organizerService = organizerService;
    }

    @PostMapping
    public Organizer createOrganizer(@RequestBody Organizer organizer) {
        return organizerService.createOrganizer(organizer);
    }

    @GetMapping
    public List<Organizer> getAllOrganizers() {
        return organizerService.getAllOrganizers();
    }

    @GetMapping("/{id}")
    public Organizer getOrganizerById(@PathVariable Long id) {
        return organizerService.getOrganizerById(id);
    }

    @GetMapping("/email/{email}")
    public Organizer getOrganizerByEmail(@PathVariable String email) {
        return organizerService.getOrganizerByEmail(email);
    }

    @DeleteMapping("/{id}")
    public String deleteOrganizer(@PathVariable Long id) {
        organizerService.deleteOrganizer(id);
        return "Organizer deleted successfully";
    }
}