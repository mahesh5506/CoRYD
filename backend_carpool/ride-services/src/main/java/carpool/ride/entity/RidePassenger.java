package carpool.ride.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "ride_passengers")
@Data
public class RidePassenger {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long rideId;
    
    @Column(nullable = false)
    private Long riderId;
    
    private String riderName;
    
    // Where did this passenger board
    private String boardingLocation;
    private Double boardingLatitude;
    private Double boardingLongitude;
    
    // Where will this passenger drop
    private String dropLocation;
    private Double dropLatitude;
    private Double dropLongitude;
    
    // Distance for THIS passenger (for fare calculation)
    private Double distanceInKm;
    private Double fareAmount;
    
    @Enumerated(EnumType.STRING)
    private PassengerStatus status;
    
    private LocalDateTime joinedAt;      // When matched
    private LocalDateTime boardedAt;     // When picked up
    private LocalDateTime droppedAt;     // When dropped
    
    private Boolean paymentCompleted;
    private Boolean rated;
    
    // NEW: Segment tracking
    private Integer startSegmentSequence;
    private Integer endSegmentSequence;

    public Integer getStartSegmentSequence() {
        return startSegmentSequence;
    }

    public void setStartSegmentSequence(Integer startSegmentSequence) {
        this.startSegmentSequence = startSegmentSequence;
    }

    public Integer getEndSegmentSequence() {
        return endSegmentSequence;
    }

    public void setEndSegmentSequence(Integer endSegmentSequence) {
        this.endSegmentSequence = endSegmentSequence;
    }
    
    public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public Long getRideId() {
		return rideId;
	}

	public void setRideId(Long rideId) {
		this.rideId = rideId;
	}

	public Long getRiderId() {
		return riderId;
	}

	public void setRiderId(Long riderId) {
		this.riderId = riderId;
	}

	public String getRiderName() {
		return riderName;
	}

	public void setRiderName(String riderName) {
		this.riderName = riderName;
	}

	public String getBoardingLocation() {
		return boardingLocation;
	}

	public void setBoardingLocation(String boardingLocation) {
		this.boardingLocation = boardingLocation;
	}

	public Double getBoardingLatitude() {
		return boardingLatitude;
	}

	public void setBoardingLatitude(Double boardingLatitude) {
		this.boardingLatitude = boardingLatitude;
	}

	public Double getBoardingLongitude() {
		return boardingLongitude;
	}

	public void setBoardingLongitude(Double boardingLongitude) {
		this.boardingLongitude = boardingLongitude;
	}

	public String getDropLocation() {
		return dropLocation;
	}

	public void setDropLocation(String dropLocation) {
		this.dropLocation = dropLocation;
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

	public Double getDistanceInKm() {
		return distanceInKm;
	}

	public void setDistanceInKm(Double distanceInKm) {
		this.distanceInKm = distanceInKm;
	}

	public Double getFareAmount() {
		return fareAmount;
	}

	public void setFareAmount(Double fareAmount) {
		this.fareAmount = fareAmount;
	}

	public PassengerStatus getStatus() {
		return status;
	}

	public void setStatus(PassengerStatus status) {
		this.status = status;
	}

	public LocalDateTime getJoinedAt() {
		return joinedAt;
	}

	public void setJoinedAt(LocalDateTime joinedAt) {
		this.joinedAt = joinedAt;
	}

	public LocalDateTime getBoardedAt() {
		return boardedAt;
	}

	public void setBoardedAt(LocalDateTime boardedAt) {
		this.boardedAt = boardedAt;
	}

	public LocalDateTime getDroppedAt() {
		return droppedAt;
	}

	public void setDroppedAt(LocalDateTime droppedAt) {
		this.droppedAt = droppedAt;
	}

	public Boolean getPaymentCompleted() {
		return paymentCompleted;
	}

	public void setPaymentCompleted(Boolean paymentCompleted) {
		this.paymentCompleted = paymentCompleted;
	}

	public Boolean getRated() {
		return rated;
	}

	public void setRated(Boolean rated) {
		this.rated = rated;
	}

	public enum PassengerStatus {
        MATCHED,        // Matched with ride, waiting for pickup
        BOARDED,        // Currently in the car
        DROPPED,        // Dropped off
        CANCELLED       // Cancelled before boarding
    }
}
