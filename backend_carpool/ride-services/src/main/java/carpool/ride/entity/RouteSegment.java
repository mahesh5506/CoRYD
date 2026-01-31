package carpool.ride.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "route_segments")
@Data
public class RouteSegment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ride_id", nullable = false)
    @JsonIgnore
    private Ride ride;

    @Column(name = "sequence_order")
    private Integer sequenceOrder; // 0, 1, 2...

    private String startLocation;
    private Double startLat;
    private Double startLng;

    private String endLocation;
    private Double endLat;
    private Double endLng;

    private Double distanceInKm;
    
    // Seat Management
    private Integer totalSeats; // Typically same as Ride capacity
    private Integer occupiedSeats; 
    
    // Pricing
    private Double baseRatePerKm; 
}
