package com.example.Eventease.registration.controller;

import com.example.Eventease.registration.Registration;
import com.example.Eventease.registration.RegistrationStatus;
import com.example.Eventease.registration.service.RegistrationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/registrations")
public class RegistrationController {

    private final RegistrationService registrationService;

    public RegistrationController(
            RegistrationService registrationService) {

        this.registrationService = registrationService;
    }

    @PostMapping
    public Registration registerStudent(
            @RequestBody Registration registration) {

        return registrationService.registerStudent(registration);
    }

    @GetMapping
    public List<Registration> getAllRegistrations() {
        return registrationService.getAllRegistrations();
    }

    @GetMapping("/{id}")
    public Registration getRegistrationById(
            @PathVariable Long id) {

        return registrationService.getRegistrationById(id);
    }

    @GetMapping("/student/{studentId}")
    public List<Registration> getRegistrationsByStudent(
            @PathVariable Long studentId) {

        return registrationService
                .getRegistrationsByStudent(studentId);
    }

    @GetMapping("/event/{eventId}")
    public List<Registration> getRegistrationsByEvent(
            @PathVariable Long eventId) {

        return registrationService
                .getRegistrationsByEvent(eventId);
    }

    @GetMapping("/student/{studentId}/event/{eventId}")
    public Registration getStudentEventRegistration(
            @PathVariable Long studentId,
            @PathVariable Long eventId) {

        return registrationService
                .getStudentEventRegistration(studentId, eventId);
    }

    @PutMapping("/{id}/cancel")
    public String cancelRegistration(@PathVariable Long id) {

        registrationService.cancelRegistration(id);

        return "Registration cancelled successfully";
    }

    @GetMapping("/status/{status}")
    public List<Registration> getRegistrationsByStatus(
            @PathVariable RegistrationStatus status) {

        return registrationService
                .getRegistrationsByStatus(status);
    }

    @DeleteMapping("/{id}")
    public String deleteRegistration(@PathVariable Long id) {

        registrationService.deleteRegistration(id);

        return "Registration deleted successfully";
    }
}