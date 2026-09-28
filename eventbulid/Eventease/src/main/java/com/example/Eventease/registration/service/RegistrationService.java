package com.example.Eventease.registration.service;

import com.example.Eventease.event.Event;
import com.example.Eventease.event.repository.EventRepository;
import com.example.Eventease.registration.Registration;
import com.example.Eventease.registration.RegistrationStatus;
import com.example.Eventease.registration.repository.RegistrationRepository;
import com.example.Eventease.student.Student;
import com.example.Eventease.student.repository.StudentRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RegistrationService {

    private final RegistrationRepository registrationRepository;
    private final StudentRepository studentRepository;
    private final EventRepository eventRepository;

    public RegistrationService(
            RegistrationRepository registrationRepository,
            StudentRepository studentRepository,
            EventRepository eventRepository) {

        this.registrationRepository = registrationRepository;
        this.studentRepository = studentRepository;
        this.eventRepository = eventRepository;
    }


    // ==============================
    // REGISTER STUDENT
    // ==============================

    public Registration registerStudent(Registration registration) {

        // Check student details
        if (registration.getStudent() == null) {
            throw new RuntimeException("Student details are required");
        }

        // Check event
        if (registration.getEvent() == null ||
                registration.getEvent().getId() == null) {

            throw new RuntimeException("Event ID is required");
        }

        Long eventId = registration.getEvent().getId();

        // Resolve or create student
        Student student;
        if (registration.getStudent().getId() != null) {
            Long studentId = registration.getStudent().getId();
            student = studentRepository.findById(studentId)
                    .orElseThrow(() ->
                            new RuntimeException("Student not found with ID: " + studentId));
        } else if (registration.getStudent().getEmail() != null && !registration.getStudent().getEmail().trim().isEmpty()) {
            String email = registration.getStudent().getEmail().trim().toLowerCase();
            String name = registration.getStudent().getName();
            String college = registration.getStudent().getCollege();
            String department = registration.getStudent().getDepartment();
            String phone = registration.getStudent().getPhone();

            student = studentRepository.findByEmail(email).map(existing -> {
                if (college != null && !college.trim().isEmpty()) existing.setCollege(college);
                if (name != null && !name.trim().isEmpty()) existing.setName(name);
                if (department != null && !department.trim().isEmpty()) existing.setDepartment(department);
                if (phone != null && !phone.trim().isEmpty()) existing.setPhone(phone);
                return studentRepository.save(existing);
            }).orElseGet(() -> {
                Student newStudent = Student.builder()
                        .name(name != null && !name.trim().isEmpty() ? name : "Student")
                        .email(email)
                        .college(college)
                        .department(department)
                        .phone(phone)
                        .build();
                return studentRepository.save(newStudent);
            });
        } else {
            throw new RuntimeException("Student email or ID is required to register");
        }

        Long studentId = student.getId();


        // ==============================
        // GET REAL EVENT FROM DATABASE
        // ==============================

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Event not found with ID: " + eventId
                        ));


        // ==============================
        // CHECK REGISTRATION DEADLINE
        // ==============================

        if (event.getRegistrationCloseTime() != null &&
                java.time.LocalDateTime.now().isAfter(event.getRegistrationCloseTime())) {

            throw new RuntimeException(
                    "Registration is closed for this event. Deadline was: " + event.getRegistrationCloseTime()
            );
        }


        // ==============================
        // CHECK DUPLICATE REGISTRATION
        // ==============================

        if (registrationRepository
                .existsByStudentIdAndEventId(studentId, eventId)) {

            throw new RuntimeException(
                    "Student already registered for this event"
            );
        }


        // ==============================
        // GET MAXIMUM SEATS
        // ==============================

        Integer maxSeats = event.getMaxSeats();

        if (maxSeats == null || maxSeats <= 0) {

            throw new RuntimeException(
                    "Event does not have a valid seat capacity"
            );
        }


        // ==============================
        // COUNT REGISTERED STUDENTS
        // ==============================

        List<Registration> registrations =
                registrationRepository.findByEventId(eventId);

        long registeredCount = registrations.stream()
                .filter(r ->
                        r.getStatus() ==
                                RegistrationStatus.REGISTERED)
                .count();


        // ==============================
        // CHECK EVENT CAPACITY
        // ==============================

        if (registeredCount >= maxSeats) {

            throw new RuntimeException(
                    "Event is full. No seats available"
            );
        }


        // ==============================
        // CREATE REGISTRATION
        // ==============================

        registration.setStudent(student);

        registration.setEvent(event);

        registration.setStatus(
                RegistrationStatus.REGISTERED
        );


        // ==============================
        // SAVE
        // ==============================

        return registrationRepository.save(registration);
    }


    // ==============================
    // GET ALL REGISTRATIONS
    // ==============================

    public List<Registration> getAllRegistrations() {

        return registrationRepository.findAll();
    }


    // ==============================
    // GET REGISTRATION BY ID
    // ==============================

    public Registration getRegistrationById(Long id) {

        return registrationRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Registration not found with ID: " + id
                        ));
    }


    // ==============================
    // GET BY STUDENT
    // ==============================

    public List<Registration> getRegistrationsByStudent(
            Long studentId) {

        return registrationRepository
                .findByStudentId(studentId);
    }


    // ==============================
    // GET BY EVENT
    // ==============================

    public List<Registration> getRegistrationsByEvent(
            Long eventId) {

        return registrationRepository
                .findByEventId(eventId);
    }


    // ==============================
    // GET STUDENT + EVENT REGISTRATION
    // ==============================

    public Registration getStudentEventRegistration(
            Long studentId,
            Long eventId) {

        return registrationRepository
                .findByStudentIdAndEventId(
                        studentId,
                        eventId
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Registration not found"
                        ));
    }


    // ==============================
    // CANCEL REGISTRATION
    // ==============================

    public Registration cancelRegistration(Long id) {

        Registration registration =
                getRegistrationById(id);

        if (registration.getStatus() ==
                RegistrationStatus.CANCELLED) {

            throw new RuntimeException(
                    "Registration is already cancelled"
            );
        }

        registration.setStatus(
                RegistrationStatus.CANCELLED
        );

        return registrationRepository.save(registration);
    }


    // ==============================
    // GET BY STATUS
    // ==============================

    public List<Registration> getRegistrationsByStatus(
            RegistrationStatus status) {

        return registrationRepository
                .findByStatus(status);
    }


    // ==============================
    // DELETE REGISTRATION
    // ==============================

    public void deleteRegistration(Long id) {

        if (!registrationRepository.existsById(id)) {

            throw new RuntimeException(
                    "Registration not found with ID: " + id
            );
        }

        registrationRepository.deleteById(id);
    }
}