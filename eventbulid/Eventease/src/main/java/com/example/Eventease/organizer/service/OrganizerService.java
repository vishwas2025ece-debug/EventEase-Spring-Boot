package com.example.Eventease.organizer.service;

import com.example.Eventease.organizer.Organizer;
import com.example.Eventease.organizer.repository.OrganizerRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OrganizerService {

    private final OrganizerRepository organizerRepository;

    public OrganizerService(OrganizerRepository organizerRepository) {
        this.organizerRepository = organizerRepository;
    }

    public Organizer createOrganizer(Organizer organizer) {

        if (organizerRepository.existsByEmail(organizer.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        return organizerRepository.save(organizer);
    }

    public List<Organizer> getAllOrganizers() {
        return organizerRepository.findAll();
    }

    public Organizer getOrganizerById(Long id) {

        return organizerRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Organizer not found"));
    }

    public Organizer getOrganizerByEmail(String email) {

        return organizerRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("Organizer not found"));
    }

    public void deleteOrganizer(Long id) {

        if (!organizerRepository.existsById(id)) {
            throw new RuntimeException("Organizer not found");
        }

        organizerRepository.deleteById(id);
    }
}