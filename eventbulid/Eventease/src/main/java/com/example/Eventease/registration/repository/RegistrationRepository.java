package com.example.Eventease.registration.repository;

import com.example.Eventease.registration.Registration;
import com.example.Eventease.registration.RegistrationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RegistrationRepository
        extends JpaRepository<Registration, Long> {

    boolean existsByStudentIdAndEventId(Long studentId, Long eventId);

    List<Registration> findByStudentId(Long studentId);

    List<Registration> findByEventId(Long eventId);

    Optional<Registration> findByStudentIdAndEventId(
            Long studentId,
            Long eventId
    );

    List<Registration> findByStatus(RegistrationStatus status);
}