// COMPLETE RIDE CONTROLLER - Using DTOs
// Path: ride-service/src/main/java/com/carpool/ride/controller/RideController.java

package carpool.ride.controller;

import carpool.ride.dto.AddPassengerDTO;
import carpool.ride.dto.CreateRideDTO;
import carpool.ride.dto.CreateRideRequestDTO;
import carpool.ride.entity.Ride;
import carpool.ride.entity.RidePassenger;
import carpool.ride.entity.RideRequest;
import carpool.ride.service.RideService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rides")
public class RideController {
    
    @Autowired
    private RideService rideService;
    
    // ==================== RIDE MANAGEMENT ====================
    
    /**
     * Driver creates a new ride
     * POST /api/rides/create
     */
    @PostMapping("/create")
    public ResponseEntity<?> createRide(@RequestBody CreateRideDTO dto) {
        try {
            Ride ride = rideService.createRide(dto);
            return ResponseEntity.ok(ride);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to create ride",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Rider creates a ride request
     * POST /api/rides/request
     */
    @PostMapping("/request")
    public ResponseEntity<?> createRideRequest(@RequestBody CreateRideRequestDTO dto) {
        try {
            RideRequest request = rideService.createRideRequest(dto);
            return ResponseEntity.ok(request);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to create ride request",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Get all pending requests for a rider
     * GET /api/rides/request/rider/{riderId}
     */
    @GetMapping("/request/rider/{riderId}")
    public ResponseEntity<?> getRiderRequests(@PathVariable Long riderId) {
        try {
            List<RideRequest> requests = rideService.getRiderRequests(riderId);
            return ResponseEntity.ok(Map.of(
                "total", requests.size(),
                "requests", requests
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to fetch rider requests",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Get ONLY ACTIVE/CURRENT requests for a rider (filters out completed/cancelled)
     * GET /api/rides/request/rider/{riderId}/active
     */
    @GetMapping("/request/rider/{riderId}/active")
    public ResponseEntity<?> getRiderActiveRequests(@PathVariable Long riderId) {
        try {
            List<RideRequest> activeRequests = rideService.getRiderActiveRequests(riderId);
            return ResponseEntity.ok(Map.of(
                "total", activeRequests.size(),
                "activeRequests", activeRequests,
                "message", activeRequests.isEmpty() ? "No active requests" : "Active requests found"
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to fetch active requests",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Get ride history for a rider (Completed rides)
     * GET /api/rides/rider/history/{riderId}
     */
    @GetMapping("/rider/history/{riderId}")
    public ResponseEntity<?> getRiderHistory(@PathVariable Long riderId) {
        try {
            List<Map<String, Object>> history = rideService.getRidesByRider(riderId);
            return ResponseEntity.ok(Map.of(
                "total", history.size(),
                "history", history
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to fetch rider history",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Set matchedRideId on a RideRequest (called by Matching Service)
     * PUT /api/rides/request/{requestId}/set-matched/{rideId}
     */
    @PutMapping("/request/{requestId}/set-matched/{rideId}")
    public ResponseEntity<?> setMatchedRideOnRequest(@PathVariable Long requestId, @PathVariable Long rideId) {
        try {
            RideRequest updated = rideService.setMatchedRideForRequest(requestId, rideId);
            return ResponseEntity.ok(Map.of("success", true, "request", updated));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to set matched ride", "message", e.getMessage()));
        }
    }
    
    /**
     * Driver accepts a ride request
     * POST /api/rides/request/{requestId}/accept?activeRideId=123
     */
    @PostMapping("/request/{requestId}/accept")
    public ResponseEntity<?> acceptRideRequest(
        @PathVariable Long requestId,
        @RequestParam(required = false) Long activeRideId
    ) {
        System.out.println("Endpoint Hit: /api/rides/request/" + requestId + "/accept (ActiveRideId: " + activeRideId + ")");
        try {
            RidePassenger passenger = rideService.acceptRideRequest(requestId, activeRideId);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Ride request accepted",
                "passenger", passenger
            ));
        } catch (Exception e) {
            System.err.println("❌ Error in endpoint acceptRideRequest: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to accept ride request",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Driver rejects a ride request
     * POST /api/rides/request/{requestId}/reject
     */
    @PostMapping("/request/{requestId}/reject")
    public ResponseEntity<?> rejectRideRequest(@PathVariable Long requestId) {
        try {
            rideService.rejectRideRequest(requestId);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Ride request rejected"
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to reject ride request",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Update ride status (WAITING → IN_PROGRESS → COMPLETED)
     * PUT /api/rides/{rideId}/status?status=IN_PROGRESS
     */
    @PutMapping("/{rideId}/status")
    public ResponseEntity<?> updateRideStatus(
        @PathVariable Long rideId, 
        @RequestParam Ride.RideStatus status
    ) {
        try {
            Ride ride = rideService.updateRideStatus(rideId, status);
            
            String message = "";
            if (status == Ride.RideStatus.IN_PROGRESS) {
                message = "Ride started successfully";
            } else if (status == Ride.RideStatus.COMPLETED) {
                message = "Ride completed. All passengers dropped and payments triggered.";
            }
            
            return ResponseEntity.ok(Map.of(
                "message", message,
                "ride", ride
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to update ride status",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Get all active rides (with available seats)
     * GET /api/rides/active
     */
    @GetMapping("/active")
    public ResponseEntity<?> getActiveRides() {
        try {
            List<Ride> rides = rideService.getActiveRides();
            return ResponseEntity.ok(Map.of(
                "total", rides.size(),
                "rides", rides
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to fetch active rides",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Get available rides excluding rides the rider already requested
     * GET /api/rides/available?riderId={riderId}
     */
    @GetMapping("/available")
    public ResponseEntity<?> getAvailableRides(@RequestParam Long riderId) {
        try {
            List<Ride> rides = rideService.getAvailableRidesForRider(riderId);
            return ResponseEntity.ok(Map.of(
                "total", rides.size(),
                "rides", rides
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to fetch available rides",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Get rides created by a specific driver
     * GET /api/rides/driver/{driverId}
     */
    @GetMapping("/driver/{driverId}")
    public ResponseEntity<?> getRidesByDriver(@PathVariable Long driverId) {
        try {
            List<Ride> rides = rideService.getRidesByDriver(driverId);
            return ResponseEntity.ok(Map.of(
                "total", rides.size(),
                "rides", rides
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to fetch driver rides",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Get ride details by ID
     * GET /api/rides/{rideId}
     */
    @GetMapping("/{rideId}")
    public ResponseEntity<?> getRideById(@PathVariable Long rideId) {
        try {
            // You'll need to add this method to RideService
            Ride ride = rideService.getRideById(rideId);
            List<RidePassenger> passengers = rideService.getRidePassengers(rideId);
            
            return ResponseEntity.ok(Map.of(
                "ride", ride,
                "passengers", passengers,
                "currentPassengersCount", rideService.getCurrentPassengers(rideId).size()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Ride not found",
                "message", e.getMessage()
            ));
        }
    }
    
    // ==================== PASSENGER MANAGEMENT ====================
    
    /**
     * Add passenger to ride (called by matching service or manually)
     * POST /api/rides/{rideId}/add-passenger
     * 
     * Body:
     * {
     *   "riderId": 2,
     *   "pickupLocation": "Hinjewadi, Pune",
     *   "pickupLatitude": 18.5912,
     *   "pickupLongitude": 73.7389,
     *   "dropLocation": "Baner, Pune",
     *   "dropLatitude": 18.5593,
     *   "dropLongitude": 73.7793
     * }
     */
    @PostMapping("/{rideId}/add-passenger")
    public ResponseEntity<?> addPassenger(
        @PathVariable Long rideId,
        @RequestBody AddPassengerDTO dto
    ) {
        try {
            // Validate DTO
            if (dto.getRiderId() == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Validation failed",
                    "message", "riderId is required"
                ));
            }
            if (dto.getPickupLatitude() == null || dto.getPickupLongitude() == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Validation failed",
                    "message", "Pickup coordinates are required"
                ));
            }
            if (dto.getDropLatitude() == null || dto.getDropLongitude() == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Validation failed",
                    "message", "Drop coordinates are required"
                ));
            }
            
            RidePassenger passenger = rideService.addPassengerToRide(
                rideId,
                dto.getRiderId(),
                dto.getPickupLocation(),
                dto.getPickupLatitude(),
                dto.getPickupLongitude(),
                dto.getDropLocation(),
                dto.getDropLatitude(),
                dto.getDropLongitude()
            );
            
            return ResponseEntity.ok(Map.of(
                "message", "Passenger added successfully",
                "passenger", passenger,
                "status", "MATCHED - Waiting for pickup"
            ));
            
        } catch (RuntimeException e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to add passenger",
                "message", e.getMessage()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Internal server error",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Board passenger (driver confirms pickup)
     * PUT /api/rides/passenger/{passengerId}/board
     */
    @PutMapping("/passenger/{passengerId}/board")
    public ResponseEntity<?> boardPassenger(@PathVariable Long passengerId) {
        try {
            RidePassenger passenger = rideService.boardPassenger(passengerId);
            
            return ResponseEntity.ok(Map.of(
                "message", "Passenger boarded successfully",
                "passenger", passenger,
                "status", "BOARDED - Passenger is in the car"
            ));
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to board passenger",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Drop passenger (frees seat + triggers payment)
     * PUT /api/rides/passenger/{passengerId}/drop
     */
    @PutMapping("/passenger/{passengerId}/drop")
    public ResponseEntity<?> dropPassenger(@PathVariable Long passengerId) {
        try {
            System.out.println("🔴 DROPPING PASSENGER - ID: " + passengerId);
            
            RidePassenger passenger = rideService.dropPassenger(passengerId);
            
            if (passenger.getFareAmount() == null) {
                System.err.println("⚠️  WARNING: Fare amount is null for passenger " + passengerId);
            }
            
            return ResponseEntity.ok(Map.of(
                "message", "Passenger dropped successfully",
                "passenger", passenger,
                "status", "DROPPED - Payment has been triggered",
                "paymentTriggered", true,
                "fareAmount", passenger.getFareAmount() != null ? passenger.getFareAmount() : 0.0,
                "seatFreed", true
            ));
            
        } catch (Exception e) {
            System.err.println("❌ ERROR dropping passenger: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                "error", "Failed to drop passenger",
                "message", e.getMessage(),
                "passengerId", passengerId
            ));
        }
    }
    
    /**
     * Get all passengers in a ride (all statuses)
     * GET /api/rides/{rideId}/passengers
     */
    @GetMapping("/{rideId}/passengers")
    public ResponseEntity<?> getRidePassengers(@PathVariable Long rideId) {
        try {
            List<RidePassenger> allPassengers = rideService.getRidePassengers(rideId);
            List<RidePassenger> currentPassengers = rideService.getCurrentPassengers(rideId);
            
            System.out.println("📋 getRidePassengers called for ride " + rideId);
            System.out.println("   Total passengers: " + allPassengers.size());
            System.out.println("   Currently boarded: " + currentPassengers.size());
            allPassengers.forEach(p -> System.out.println("   - Passenger " + p.getId() + " (Rider: " + p.getRiderId() + "): " + p.getStatus()));
            
            // Group by status
            Map<String, List<RidePassenger>> groupedByStatus = new HashMap<>();
            for (RidePassenger p : allPassengers) {
                String status = p.getStatus().name();
                groupedByStatus.computeIfAbsent(status, k -> new java.util.ArrayList<>()).add(p);
            }
            
            return ResponseEntity.ok(Map.of(
                "total", allPassengers.size(),
                "currentlyBoarded", currentPassengers.size(),
                "allPassengers", allPassengers,
                "byStatus", groupedByStatus
            ));
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to fetch passengers",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Get only currently boarded passengers
     * GET /api/rides/{rideId}/current-passengers
     */
    @GetMapping("/{rideId}/current-passengers")
    public ResponseEntity<?> getCurrentPassengers(@PathVariable Long rideId) {
        try {
            List<RidePassenger> passengers = rideService.getCurrentPassengers(rideId);
            
            return ResponseEntity.ok(Map.of(
                "count", passengers.size(),
                "passengers", passengers,
                "status", "Currently in the car"
            ));
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to fetch current passengers",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Get passenger by ID
     * GET /api/rides/passenger/{passengerId}
     */
    @GetMapping("/passenger/{passengerId}")
    public ResponseEntity<?> getPassengerById(@PathVariable Long passengerId) {
        try {
            RidePassenger passenger = rideService.getPassengerById(passengerId);
            
            return ResponseEntity.ok(Map.of(
                "passenger", passenger,
                "statusDescription", getStatusDescription(passenger.getStatus())
            ));
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Passenger not found",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Get all pending ride requests for a specific ride
     * GET /api/rides/{rideId}/requests
     */
    @GetMapping("/{rideId}/requests")
    public ResponseEntity<?> getPendingRequests(@PathVariable Long rideId) {
        try {
            List<RideRequest> requests = rideService.getPendingRequestsForRide(rideId);
            
            return ResponseEntity.ok(Map.of(
                "rideId", rideId,
                "requests", requests,
                "count", requests.size()
            ));
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to fetch pending requests",
                "message", e.getMessage()
            ));
        }
    }
    
    // ==================== TESTING/DEBUGGING ====================
    
    /**
     * DELETE ALL RIDES - For testing/debugging only
     * DELETE /api/rides/admin/delete-all
     */
    @DeleteMapping("/admin/delete-all")
    public ResponseEntity<?> deleteAllRides() {
        try {
            rideService.deleteAllRides();
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "All rides deleted successfully"
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to delete rides",
                "message", e.getMessage()
            ));
        }
    }
    
    // ==================== HELPER METHODS ====================
    
    private String getStatusDescription(RidePassenger.PassengerStatus status) {
        switch (status) {
            case MATCHED:
                return "Matched with ride, waiting for driver to pick up";
            case BOARDED:
                return "Currently in the car";
            case DROPPED:
                return "Dropped off, payment triggered";
            case CANCELLED:
                return "Cancelled before boarding";
            default:
                return "Unknown status";
        }
    }
}
