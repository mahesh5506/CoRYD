package carpool.ride.dto;

import lombok.Data;

@Data
public class StopDTO {
    private String locationName;
    private Double latitude;
    private Double longitude;
}
