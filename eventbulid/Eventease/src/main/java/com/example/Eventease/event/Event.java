package com.example.Eventease.event;

import com.example.Eventease.organizer.Organizer;
import com.example.Eventease.registration.Registration;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false)
    private LocalDate date;

    private String time;

    @Column(nullable = false)
    private String venue;

    private String college;

    @Column(nullable = false)
    private Integer maxSeats;

    private LocalDateTime registrationCloseTime;

    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organizer_id", nullable = false)
    private Organizer organizer;

    @JsonIgnore
    @OneToMany(mappedBy = "event")
    @Builder.Default
    private List<Registration> registrations = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}