package carpool.ride.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "rides")
@Data
public class Ride {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private Long driverId;
    private String driverName;
    
    @Column(nullable = false)
    private String pickupLocation;
    
    @Column(nullable = false)
    private String dropLocation;
    
    @Column(nullable = false)
    private String route;
    
    // NEW: Coordinates for pickup
    private Double pickupLatitude;
    private Double pickupLongitude;
    
    // NEW: Coordinates for drop
    private Double dropLatitude;
    private Double dropLongitude;
    
    private Integer totalSeats;
    private Integer availableSeats;
    
    @Enumerated(EnumType.STRING)
    private RideStatus status;
    
    private LocalDateTime createdAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    
    // Map integration fields
    private Double distanceInKm;
    private Long estimatedDurationMinutes;
    private Double estimatedFare;
    private String routeInformation;
    
    @Transient
    private java.util.List<RidePassenger> passengers;
    
    public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public Long getDriverId() {
		return driverId;
	}

	public void setDriverId(Long driverId) {
		this.driverId = driverId;
	}

	public String getDriverName() {
		return driverName;
	}

	public void setDriverName(String driverName) {
		this.driverName = driverName;
	}

	public String getPickupLocation() {
		return pickupLocation;
	}

	public void setPickupLocation(String pickupLocation) {
		this.pickupLocation = pickupLocation;
	}

	public String getDropLocation() {
		return dropLocation;
	}

	public void setDropLocation(String dropLocation) {
		this.dropLocation = dropLocation;
	}

	public String getRoute() {
		return route;
	}

	public void setRoute(String route) {
		this.route = route;
	}

	public Double getPickupLatitude() {
		return pickupLatitude;
	}

	public void setPickupLatitude(Double pickupLatitude) {
		this.pickupLatitude = pickupLatitude;
	}

	public Double getPickupLongitude() {
		return pickupLongitude;
	}

	public void setPickupLongitude(Double pickupLongitude) {
		this.pickupLongitude = pickupLongitude;
	}

	public Double getDropLatitude() {
		return dropLatitude;
	}

	public void setDropLatitude(Double dropLatitude) {
		this.dropLatitude = dropLatitude;
	}

	public Double getDropLongitude() {
		return dropLongitude;
	}

	public void setDropLongitude(Double dropLongitude) {
		this.dropLongitude = dropLongitude;
	}

	public Integer getTotalSeats() {
		return totalSeats;
	}

	public void setTotalSeats(Integer totalSeats) {
		this.totalSeats = totalSeats;
	}

	public Integer getAvailableSeats() {
		return availableSeats;
	}

	public void setAvailableSeats(Integer availableSeats) {
		this.availableSeats = availableSeats;
	}

	public RideStatus getStatus() {
		return status;
	}

	public void setStatus(RideStatus status) {
		this.status = status;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}

	public LocalDateTime getStartedAt() {
		return startedAt;
	}

	public void setStartedAt(LocalDateTime startedAt) {
		this.startedAt = startedAt;
	}

	public LocalDateTime getCompletedAt() {
		return completedAt;
	}

	public void setCompletedAt(LocalDateTime completedAt) {
		this.completedAt = completedAt;
	}

	public Double getDistanceInKm() {
		return distanceInKm;
	}

	public void setDistanceInKm(Double distanceInKm) {
		this.distanceInKm = distanceInKm;
	}

	public Long getEstimatedDurationMinutes() {
		return estimatedDurationMinutes;
	}

	public void setEstimatedDurationMinutes(Long estimatedDurationMinutes) {
		this.estimatedDurationMinutes = estimatedDurationMinutes;
	}

	public Double getEstimatedFare() {
		return estimatedFare;
	}

	public void setEstimatedFare(Double estimatedFare) {
		this.estimatedFare = estimatedFare;
	}

	public String getRouteInformation() {
		return routeInformation;
	}

	public void setRouteInformation(String routeInformation) {
		this.routeInformation = routeInformation;
	}

    public java.util.List<RidePassenger> getPassengers() {
        return passengers;
    }

    public void setPassengers(java.util.List<RidePassenger> passengers) {
        this.passengers = passengers;
    }

    @OneToMany(cascade = CascadeType.ALL, mappedBy = "ride", fetch = FetchType.EAGER)
    private java.util.List<RouteSegment> segments;

    public java.util.List<RouteSegment> getSegments() {
        return segments;
    }

    public void setSegments(java.util.List<RouteSegment> segments) {
        this.segments = segments;
    }

	public enum RideStatus {
        WAITING,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED
    }
}