package carpool.ride.dto;

import lombok.Data;

@Data
public class CreateRideRequestDTO {
    private Long riderId;
    private String pickupLocation;
    private String dropLocation;
    private Double pickupLatitude;
    private Double pickupLongitude;
    private Double dropLatitude;
    private Double dropLongitude;
    
    // Add matchedRideId to allow direct booking of specific rides
    private Long matchedRideId;
    
    private Double distance;
    private Double fare;
	public Long getRiderId() {
		return riderId;
	}
	public void setRiderId(Long riderId) {
		this.riderId = riderId;
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

    public Long getMatchedRideId() {
        return matchedRideId;
    }

    public void setMatchedRideId(Long matchedRideId) {
        this.matchedRideId = matchedRideId;
    }
}