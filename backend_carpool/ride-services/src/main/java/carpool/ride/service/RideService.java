package carpool.ride.service;

import carpool.ride.dto.CreateRideDTO;
import carpool.ride.dto.CreateRideRequestDTO;
import carpool.ride.entity.Ride;
import carpool.ride.entity.RidePassenger;
import carpool.ride.entity.RideRequest;
import carpool.ride.repository.RideRepository;
import carpool.ride.repository.RidePassengerRepository;
import carpool.ride.repository.RideRequestRepository;
import carpool.ride.util.MapDistanceUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import carpool.ride.entity.RouteSegment;
import carpool.ride.dto.StopDTO;
import java.util.ArrayList;
import java.util.Optional;

@Service
public class RideService {
    
    @Autowired
    private RideRepository rideRepository;
    
    @Autowired
    private RideRequestRepository requestRepository;
    
    @Autowired
    private RidePassengerRepository passengerRepository;
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Autowired
    private MapDistanceUtil mapDistanceUtil;
    
    /**
     * Driver creates a ride
     */
    public Ride createRide(CreateRideDTO dto) {
        // PREVENT DUPLICATES: Check if driver already has an active ride
        List<Ride> existingRides = rideRepository.findByDriverId(dto.getDriverId());
        Optional<Ride> activeRide = existingRides.stream()
            .filter(r -> r.getStatus() == Ride.RideStatus.WAITING || r.getStatus() == Ride.RideStatus.IN_PROGRESS)
            .findFirst();
            
        if (activeRide.isPresent()) {
            Ride existing = activeRide.get();
            List<RidePassenger> passengers = passengerRepository.findByRideId(existing.getId());
            boolean hasActivePassengers = passengers.stream()
                .anyMatch(p -> p.getStatus() != RidePassenger.PassengerStatus.CANCELLED);
                
            if (!hasActivePassengers) {
                System.out.println(" Found empty stale ride " + existing.getId() + ". Auto-cancelling it to allow new ride.");
                existing.setStatus(Ride.RideStatus.CANCELLED);
                rideRepository.save(existing);
            } else {
                System.out.println("Driver " + dto.getDriverId() + " has active ride " + existing.getId() + " with passengers. Returning existing.");
                return existing;
            }
        }

        String userServiceUrl = "http://localhost:8081/api/users/" + dto.getDriverId();
        Map driver = restTemplate.getForObject(userServiceUrl, Map.class);
        
        Ride ride = new Ride();
        ride.setDriverId(dto.getDriverId());
        ride.setDriverName((String) driver.get("name"));
        ride.setPickupLocation(dto.getPickupLocation());
        ride.setDropLocation(dto.getDropLocation());
        ride.setRoute(dto.getRoute());
        ride.setTotalSeats(dto.getTotalSeats());
        ride.setAvailableSeats(dto.getTotalSeats()); // Initially all seats available
        ride.setStatus(Ride.RideStatus.WAITING);
        ride.setCreatedAt(LocalDateTime.now());
        
        ride.setPickupLatitude(dto.getPickupLatitude());
        ride.setPickupLongitude(dto.getPickupLongitude());
        ride.setDropLatitude(dto.getDropLatitude());
        ride.setDropLongitude(dto.getDropLongitude());
        
        // --- SEGMENT GENERATION LOGIC ---
        List<RouteSegment> segments = new ArrayList<>();
        List<StopDTO> allPoints = new ArrayList<>();
        
        // Add Start
        StopDTO start = new StopDTO();
        start.setLocationName(dto.getPickupLocation());
        start.setLatitude(dto.getPickupLatitude());
        start.setLongitude(dto.getPickupLongitude());
        allPoints.add(start);
        
        // Add Intermediates
        if (dto.getIntermediateStops() != null) {
            allPoints.addAll(dto.getIntermediateStops());
        }
        
        // Add End
        StopDTO end = new StopDTO();
        end.setLocationName(dto.getDropLocation());
        end.setLatitude(dto.getDropLatitude());
        end.setLongitude(dto.getDropLongitude());
        allPoints.add(end);
        
        double totalDistance = 0.0;
        
        for (int i = 0; i < allPoints.size() - 1; i++) {
            StopDTO from = allPoints.get(i);
            StopDTO to = allPoints.get(i + 1);
            
            RouteSegment seg = new RouteSegment();
            seg.setRide(ride);
            seg.setSequenceOrder(i);
            seg.setStartLocation(from.getLocationName());
            seg.setStartLat(from.getLatitude());
            seg.setStartLng(from.getLongitude());
            seg.setEndLocation(to.getLocationName());
            seg.setEndLat(to.getLatitude());
            seg.setEndLng(to.getLongitude());
            
            seg.setTotalSeats(dto.getTotalSeats());
            seg.setOccupiedSeats(0);
            seg.setBaseRatePerKm(10.0); // Default, can be configurable
            
            try {
                double d = mapDistanceUtil.calculateDistance(from.getLatitude(), from.getLongitude(), to.getLatitude(), to.getLongitude());
                seg.setDistanceInKm(d);
                totalDistance += d;
            } catch (Exception e) {
                seg.setDistanceInKm(10.0); // Fallback
                totalDistance += 10.0;
            }
            
            segments.add(seg);
        }
        
        ride.setSegments(segments);
        ride.setDistanceInKm(totalDistance);
        
        // Estimate total duration
        try {
             long duration = mapDistanceUtil.calculateDuration(
                dto.getPickupLatitude(), dto.getPickupLongitude(),
                dto.getDropLatitude(), dto.getDropLongitude()
            );
            ride.setEstimatedDurationMinutes(duration);
        } catch (Exception e) {
            ride.setEstimatedDurationMinutes(60L); // Default 1 hour
        }
        
        return rideRepository.save(ride);
    }
    
    /**
     * Rider creates ride request - this will trigger matching
     */
    public RideRequest createRideRequest(CreateRideRequestDTO dto) {
        String userServiceUrl = "http://localhost:8081/api/users/" + dto.getRiderId();
        Map rider = restTemplate.getForObject(userServiceUrl, Map.class);
        
        RideRequest request = new RideRequest();
        request.setRiderId(dto.getRiderId());
        request.setRiderName((String) rider.get("name"));
        request.setPickupLocation(dto.getPickupLocation());
        request.setDropLocation(dto.getDropLocation());
        request.setPickupLatitude(dto.getPickupLatitude());
        request.setPickupLongitude(dto.getPickupLongitude());
        request.setDropLatitude(dto.getDropLatitude());
        request.setDropLongitude(dto.getDropLongitude());
        request.setStatus(RideRequest.RequestStatus.PENDING);
        
        // Fix: Save matchedRideId if provided (Direct Booking)
        if (dto.getMatchedRideId() != null) {
            request.setMatchedRideId(dto.getMatchedRideId());
        }
        
        // Pass distinct Road Distance & Fare from Frontend (if available)
        request.setDistance(dto.getDistance());
        request.setFare(dto.getFare());
        
        request.setCreatedAt(LocalDateTime.now());
        
        RideRequest savedRequest = requestRepository.save(request);
        
        // Trigger matching
        callMatchingService(savedRequest);
        
        return savedRequest;
    }

    /**
     * Set the matchedRideId for a RideRequest
     */
    public RideRequest setMatchedRideForRequest(Long requestId, Long rideId) {
        RideRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new RuntimeException("Request not found: " + requestId));
        request.setMatchedRideId(rideId);
        return requestRepository.save(request);
    }
    
    /**
     * Get all requests for a rider
     */
    public List<RideRequest> getRiderRequests(Long riderId) {
        return requestRepository.findByRiderId(riderId);
    }
    
    /**
     * Get ONLY ACTIVE/CURRENT requests for a rider (PENDING status only)
     * This filters out COMPLETED, CANCELLED, and old requests
     */
    public List<RideRequest> getRiderActiveRequests(Long riderId) {
        return requestRepository.findByRiderId(riderId).stream()
            .filter(req -> req.getStatus() == RideRequest.RequestStatus.PENDING)
            .toList();
    }
    
    /**
     * Get all pending requests for a specific ride
     */
    public List<RideRequest> getPendingRequestsForRide(Long rideId) {
        // Verify ride exists
        Ride ride = rideRepository.findById(rideId)
            .orElseThrow(() -> new RuntimeException("Ride not found with id: " + rideId));
        
        System.out.println("=== getPendingRequestsForRide ===");
        System.out.println("Ride ID: " + rideId);
        System.out.println("Ride pickup: " + ride.getPickupLocation());
        System.out.println("Ride drop: " + ride.getDropLocation());
        
        // FILTER: Only show requests created in the last 2 hours (recent requests only, no old stale requests)
        LocalDateTime requestCutoffTime = LocalDateTime.now().minusHours(2);
        System.out.println("Filtering requests created after: " + requestCutoffTime);
        
        // Get all requests, prioritizing those specifically matched to this ride
        List<RideRequest> allRequests = requestRepository.findAll();
        System.out.println("Total requests in DB: " + allRequests.size());
        
        // First, get requests that are MATCHED to this specific ride AND are recent
        List<RideRequest> matchedToThisRide = allRequests.stream()
            .filter(req -> req.getMatchedRideId() != null && 
                          req.getMatchedRideId().equals(rideId) &&
                          req.getStatus() == RideRequest.RequestStatus.PENDING &&  // ✅ ONLY PENDING 
                          req.getCreatedAt() != null &&
                          req.getCreatedAt().isAfter(requestCutoffTime))  // Only recent requests
            .toList();
        
        System.out.println("Matched to this ride (recent & pending): " + matchedToThisRide.size());
        
        // Match by Route (Fallback for when MatchingService matches by location but hasn't linked ID yet)
        List<RideRequest> pendingByRoute = allRequests.stream()
            .filter(req -> {
                boolean isPending = req.getStatus() == RideRequest.RequestStatus.PENDING;
                boolean isRecent = req.getCreatedAt() != null && req.getCreatedAt().isAfter(requestCutoffTime);
                boolean notAlreadyMatched = !matchedToThisRide.contains(req); // Avoid duplicates
                
                // Route check
                boolean pickupMatch = req.getPickupLocation() != null && req.getPickupLocation().equalsIgnoreCase(ride.getPickupLocation());
                boolean dropMatch = req.getDropLocation() != null && req.getDropLocation().equalsIgnoreCase(ride.getDropLocation());

                return isPending && isRecent && notAlreadyMatched && pickupMatch && dropMatch;
            })
            .toList();
        
        System.out.println("Pending by route (recent): " + pendingByRoute.size());
        
        // Combine lists
        List<RideRequest> finalRequests = new java.util.ArrayList<>(matchedToThisRide);
        finalRequests.addAll(pendingByRoute);
        
        System.out.println("Returning total pending: " + finalRequests.size());
        return finalRequests;
    }
    
    /**
     * Driver accepts a ride request - converts RideRequest to RidePassenger
     */
    /**
     * Driver accepts a ride request - converts RideRequest to RidePassenger
     */
    @org.springframework.transaction.annotation.Transactional
    public RidePassenger acceptRideRequest(Long requestId, Long activeRideId) {
        System.out.println("\n===  ACCEPT RIDE REQUEST (SEGMENT BASED) ===");
        
        RideRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new RuntimeException("Request not found"));
        
        if (request.getStatus() != RideRequest.RequestStatus.PENDING) {
            throw new RuntimeException("Request is not PENDING");
        }
        
        // 1. Find Ride
        Ride ride = null;
        if (activeRideId != null) {
            ride = rideRepository.findById(activeRideId).orElse(null);
        }
        if (ride == null && request.getMatchedRideId() != null) {
            ride = rideRepository.findById(request.getMatchedRideId()).orElse(null);
        }
        
        if (ride == null) {
             throw new RuntimeException("Ride not found for request " + requestId);
        }

        // 2. Identify Segments
        int[] indices = findSegmentRange(ride, 
            request.getPickupLatitude(), request.getPickupLongitude(),
            request.getDropLatitude(), request.getDropLongitude());
            
        int startIdx = indices[0];
        int endIdx = indices[1];
        
        if (startIdx == -1 || endIdx == -1 || startIdx > endIdx) {
            System.err.println(" Invalid segment range: " + startIdx + " to " + endIdx);
            // Fallback for non-segmented rides?
            // throw new RuntimeException("Could not map pickup/drop to valid route segments");
            // Just assume full ride if segments missing or invalid
            startIdx = 0;
            endIdx = (ride.getSegments() != null) ? ride.getSegments().size() - 1 : 0;
        }
        
        List<RouteSegment> rideSegments = ride.getSegments();
        List<RouteSegment> requiredSegments = new java.util.ArrayList<>();
        
        // 3. Check Capacity & Lock
        if (rideSegments != null && !rideSegments.isEmpty()) {
            for (int i = startIdx; i <= endIdx; i++) {
                RouteSegment seg = rideSegments.get(i);
                if (seg.getOccupiedSeats() >= seg.getTotalSeats()) {
                    throw new RuntimeException("Segment " + i + " is FULL");
                }
                requiredSegments.add(seg);
            }
            
            // All good - Increment Seats
            for (RouteSegment seg : requiredSegments) {
                seg.setOccupiedSeats(seg.getOccupiedSeats() + 1);
            }
        } else {
             // Fallback for legacy rides without segments
            if (ride.getAvailableSeats() <= 0) throw new RuntimeException("Ride full");
            ride.setAvailableSeats(ride.getAvailableSeats() - 1);
        }
        
        rideRepository.save(ride); 
        
        // 4. Create Passenger
        RidePassenger passenger = new RidePassenger();
        passenger.setRideId(ride.getId());
        passenger.setRiderId(request.getRiderId());
        passenger.setRiderName(request.getRiderName());
        passenger.setBoardingLocation(request.getPickupLocation());
        passenger.setDropLocation(request.getDropLocation());
        passenger.setStatus(RidePassenger.PassengerStatus.MATCHED);
        passenger.setJoinedAt(LocalDateTime.now());
        
        passenger.setStartSegmentSequence(startIdx);
        passenger.setEndSegmentSequence(endIdx);
        
        double estimatedFare = calculatePreliminaryFare(ride, startIdx, endIdx);
        if (estimatedFare == 0) estimatedFare = 50.0; // fallback
        
        passenger.setFareAmount(estimatedFare);
        passenger.setDistanceInKm(mapDistanceUtil.calculateDistance(
             request.getPickupLatitude(), request.getPickupLongitude(),
             request.getDropLatitude(), request.getDropLongitude()));

        RidePassenger savedPassenger = passengerRepository.save(passenger);
        
        request.setMatchedRideId(ride.getId());
        request.setStatus(RideRequest.RequestStatus.MATCHED);
        requestRepository.save(request);
        
        System.out.println("Accepted! Passenger " + savedPassenger.getId());
        return savedPassenger;
    }
    
    /**
     * Driver rejects a ride request
     */
    public void rejectRideRequest(Long requestId) {
        RideRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new RuntimeException("Request not found"));
        
        // Change status to something other than PENDING
        // Could use COMPLETED to mark as no longer available
        request.setStatus(RideRequest.RequestStatus.COMPLETED);      
        requestRepository.save(request);
    }
    
    /**
     * Add passenger to ride (called by matching service)
     */
    public RidePassenger addPassengerToRide(Long rideId, Long riderId, 
                                            String pickupLocation, Double pickupLat, Double pickupLng,
                                            String dropLocation, Double dropLat, Double dropLng) {
        
        Ride ride = rideRepository.findById(rideId)
            .orElseThrow(() -> new RuntimeException("Ride not found"));
        
        // Check if seats available
        if (ride.getAvailableSeats() <= 0) {
            throw new RuntimeException("No seats available");
        }

        if (passengerRepository.existsByRideIdAndRiderId(rideId, riderId)) {
            throw new RuntimeException("Passenger already joined this ride");
        }
        
        // Get rider info
        String userServiceUrl = "http://localhost:8081/api/users/" + riderId;
        Map rider = restTemplate.getForObject(userServiceUrl, Map.class);
        
        // Create passenger record
        RidePassenger passenger = new RidePassenger();
        passenger.setRideId(rideId);
        passenger.setRiderId(riderId);
        passenger.setRiderName((String) rider.get("name"));
        passenger.setBoardingLocation(pickupLocation);
        passenger.setBoardingLatitude(pickupLat);
        passenger.setBoardingLongitude(pickupLng);
        passenger.setDropLocation(dropLocation);
        passenger.setDropLatitude(dropLat);
        passenger.setDropLongitude(dropLng);
        passenger.setStatus(RidePassenger.PassengerStatus.MATCHED);
        passenger.setJoinedAt(LocalDateTime.now());
        passenger.setPaymentCompleted(false);
        passenger.setRated(false);
        
        // Calculate passenger's individual distance and fare
        try {
            double distance = mapDistanceUtil.calculateDistance(
                pickupLat, pickupLng, dropLat, dropLng
            );
            passenger.setDistanceInKm(distance);
            
            // Calculate fare: Base 50 + 10/km
            // distance is already calculated above
            
            // Calculate base fare
            double totalBaseFare = 50.0 + (distance * 10.0);
            
            // SHARED FARE LOGIC: Divide by total number of passengers
            List<RidePassenger> allPassengers = passengerRepository.findByRideId(passenger.getRideId());
            long participantCount = allPassengers.stream()
                .filter(p -> p.getStatus() != RidePassenger.PassengerStatus.CANCELLED)
                .count();
                
            if (participantCount < 1) participantCount = 1; // Safety check
            
            double splitFare = totalBaseFare / participantCount;
            
            // Round to 2 decimals
            splitFare = Math.round(splitFare * 100.0) / 100.0;
            
            passenger.setFareAmount(splitFare);
            
            System.out.println(" Passenger added: " + distance + " km");
            System.out.println(" Total Base Fare: ₹" + totalBaseFare);
            System.out.println(" Sharing with " + participantCount + " passengers");
            System.out.println(" Final Split Fare: ₹" + splitFare);
            
        } catch (Exception e) {
            System.err.println(" Distance calculation failed for passenger");
            passenger.setDistanceInKm(0.0);
            passenger.setFareAmount(50.0);
        }
        
        // Update available seats
        ride.setAvailableSeats(ride.getAvailableSeats() - 1);
        rideRepository.save(ride);

        
        return passengerRepository.save(passenger);
    }
    
    /**
     * Passenger boards the ride (driver confirms pickup)
     */
    public RidePassenger boardPassenger(Long passengerId) {
        RidePassenger passenger = passengerRepository.findById(passengerId)
            .orElseThrow(() -> new RuntimeException("Passenger not found"));
        
        passenger.setStatus(RidePassenger.PassengerStatus.BOARDED);
        passenger.setBoardedAt(LocalDateTime.now());
        
        return passengerRepository.save(passenger);
    }
    
    /**
     * Passenger drops off (seat becomes free again!)
     */
    @org.springframework.transaction.annotation.Transactional
    public RidePassenger dropPassenger(Long passengerId) {
        System.out.println(" DROP PASSENGER - ID: " + passengerId);
        
        RidePassenger passenger = passengerRepository.findById(passengerId)
            .orElseThrow(() -> new RuntimeException("Passenger not found: " + passengerId));
            
        Ride ride = rideRepository.findById(passenger.getRideId())
            .orElseThrow(() -> new RuntimeException("Ride not found"));
            
        List<RouteSegment> segments = ride.getSegments();
        double finalFare = 0.0;
        
        int start = passenger.getStartSegmentSequence() != null ? passenger.getStartSegmentSequence() : 0;
        int end = passenger.getEndSegmentSequence() != null ? passenger.getEndSegmentSequence() : 0;
        
        if (segments != null && !segments.isEmpty()) {
            System.out.println("   Releasing seats for segments " + start + " to " + end);
            for (int i = start; i <= end; i++) {
                if (i < segments.size()) {
                    RouteSegment seg = segments.get(i);
                    // Free up seat
                    seg.setOccupiedSeats(Math.max(0, seg.getOccupiedSeats() - 1));
                }
            }
            
            // FIX: Update global available seats to unblock search visibility
            if (ride.getAvailableSeats() < ride.getTotalSeats()) {
                ride.setAvailableSeats(ride.getAvailableSeats() + 1);
            }
        } else {
            // Fallback legacy
             ride.setAvailableSeats(ride.getAvailableSeats() + 1);
        }
        
        rideRepository.save(ride);
        
        // SIMPLIFIED FARE CALCULATION
        // Rely on the precise distance calculated at acceptance time
        Double dist = passenger.getDistanceInKm();
        if (dist == null || dist == 0) {
             // Fallback re-calculate
             dist = mapDistanceUtil.calculateDistance(
                 passenger.getBoardingLatitude(), passenger.getBoardingLongitude(),
                 passenger.getDropLatitude(), passenger.getDropLongitude()
             );
             passenger.setDistanceInKm(dist);
        }
        
        // Fare = Base 30 + 10/km (Updated to match Frontend)
        finalFare = 30.0 + (dist * 10.0);
        
        finalFare = Math.round(finalFare * 100.0) / 100.0;
        passenger.setFareAmount(finalFare);
        passenger.setDroppedAt(LocalDateTime.now());
        passenger.setStatus(RidePassenger.PassengerStatus.DROPPED);
        
        triggerPayment(passenger);
        
        System.out.println("Dropped! Final Fare: ₹" + finalFare);
        return passengerRepository.save(passenger);
    }

    
    /**
     * Get all passengers in a ride
     */
    public List<RidePassenger> getRidePassengers(Long rideId) {
        return passengerRepository.findByRideId(rideId);
    }
    
    /**
     * Get currently boarded passengers
     */
    public List<RidePassenger> getCurrentPassengers(Long rideId) {
        return passengerRepository.findByRideIdAndStatus(rideId, RidePassenger.PassengerStatus.BOARDED);
    }
    
    /**
     * Update ride status
     */
    public Ride updateRideStatus(Long rideId, Ride.RideStatus status) {
        Ride ride = rideRepository.findById(rideId)
            .orElseThrow(() -> new RuntimeException("Ride not found"));
        
        ride.setStatus(status);
        if (status == Ride.RideStatus.IN_PROGRESS) {
            ride.setStartedAt(LocalDateTime.now());
        } else if (status == Ride.RideStatus.COMPLETED) {
            ride.setCompletedAt(LocalDateTime.now());
            
            // Trigger payments for all remaining passengers
            List<RidePassenger> remainingPassengers = passengerRepository
                .findByRideIdAndStatus(rideId, RidePassenger.PassengerStatus.BOARDED);
            
            for (RidePassenger passenger : remainingPassengers) {
                dropPassenger(passenger.getId());
            }
        }
        
        return rideRepository.save(ride);
    }
    
    /**
     * Get active rides with available seats
     */
    public List<Ride> getActiveRides() {
        return rideRepository.findByStatus(Ride.RideStatus.WAITING);
    }

    /**
     * Get available rides for a rider with STRICT visibility filtering
     * 
     * Visibility Rules:
     * - Show ONLY ACTIVE WAITING rides (not COMPLETED, IN_PROGRESS, or old rides)
     * - Allow multiple riders to see the same ride
     * - Only filter at frontend level (rider cannot book their own ride twice)
     * - Re-calculate available seats from actual bookings
     * 
     * CRITICAL: Force database refresh to ensure consistency across clients
     */
    public List<Ride> getAvailableRidesForRider(Long riderId) {
        System.out.println("\n========== SEARCHING RIDES FOR RIDER " + riderId + " (Fresh DB Query) ==========");
        
        // CRITICAL: Fresh database query with forced refresh (not cached)
        // This ensures we get the latest state of rides even if another rider just booked one
        // Return WAITING (not started) OR IN_PROGRESS (started but potentially has empty seats)
        List<Ride> allActiveRides = rideRepository.findAll().stream()
            .filter(r -> r.getStatus() == Ride.RideStatus.WAITING || r.getStatus() == Ride.RideStatus.IN_PROGRESS)
            .collect(java.util.stream.Collectors.toList());
        
        // FILTER: Only show rides created in the last 24 hours (recently created/active rides)
        LocalDateTime cutoffTime = LocalDateTime.now().minusHours(24);
        List<Ride> recentActiveRides = allActiveRides.stream()
            .filter(ride -> ride.getCreatedAt() != null && ride.getCreatedAt().isAfter(cutoffTime))
            .filter(ride -> ride.getAvailableSeats() > 0) // Basic filtered
            .toList();
        
        System.out.println("Total WAITING (ACTIVE/RECENT) rides in system: " + recentActiveRides.size());
        
        // DEDUPLICATE: If same driver has multiple rides with same route, show only most recent
        Map<String, Ride> uniqueRidesMap = new HashMap<>();
        for (Ride ride : recentActiveRides) {
            String key = ride.getDriverId() + "|" + ride.getPickupLocation().toLowerCase() + "|" + ride.getDropLocation().toLowerCase();
            if (!uniqueRidesMap.containsKey(key)) {
                uniqueRidesMap.put(key, ride);
            } else {
                // Keep the newer one
                Ride existing = uniqueRidesMap.get(key);
                if (ride.getCreatedAt().isAfter(existing.getCreatedAt())) {
                    uniqueRidesMap.put(key, ride);
                }
            }
        }
        
        List<Ride> uniqueRides = uniqueRidesMap.values().stream()
                .sorted((r1, r2) -> r2.getCreatedAt().compareTo(r1.getCreatedAt()))
                .toList();

        System.out.println("   Filtered duplicates. Returning " + uniqueRides.size() + " unique rides.");
        
        List<Ride> availableRides = uniqueRides.stream()
            .peek(ride -> {
                // CRITICAL: Always recalculate from actual DB records to ensure consistency
                // Do NOT use the cached ride.availableSeats value
                List<RidePassenger> matchedPassengers = passengerRepository.findByRideIdAndStatus(ride.getId(), RidePassenger.PassengerStatus.MATCHED);
                List<RidePassenger> boardedPassengers = passengerRepository.findByRideIdAndStatus(ride.getId(), RidePassenger.PassengerStatus.BOARDED);
                
                // Count all active passengers (MATCHED or BOARDED)
                int activePassengers = matchedPassengers.size() + boardedPassengers.size();
                int seatsAvailable = ride.getTotalSeats() - activePassengers;
                
                // CRITICAL: ALWAYS override with recalculated value
                ride.setAvailableSeats(seatsAvailable);
                
                // Populate the transient passengers list for frontend visibility
                ride.setPassengers(new java.util.ArrayList<>());
                if (!matchedPassengers.isEmpty()) ride.getPassengers().addAll(matchedPassengers);
                if (!boardedPassengers.isEmpty()) ride.getPassengers().addAll(boardedPassengers);
            })
            .toList();
        
        return availableRides;
    }

    /**
     * Get rides for a specific driver (all statuses)
     */
    public List<Ride> getRidesByDriver(Long driverId) {
        List<Ride> rides = rideRepository.findByDriverId(driverId);
        
        // Populate passengers for history calculation
        rides.forEach(ride -> {
            List<RidePassenger> passengers = passengerRepository.findByRideId(ride.getId());
            ride.setPassengers(passengers);
        });
        
        return rides;
    }
    
    /**
     * Trigger payment for dropped passenger
     */
    private void triggerPayment(RidePassenger passenger) {
        String paymentServiceUrl = "http://localhost:8085/api/payments/process";
        
        Map<String, Object> paymentData = new HashMap<>();
        paymentData.put("rideId", passenger.getRideId());
        paymentData.put("riderId", passenger.getRiderId());
        paymentData.put("amount", passenger.getFareAmount());
        paymentData.put("method", "UPI");
        
        new Thread(() -> {
            try {
                restTemplate.postForObject(paymentServiceUrl, paymentData, Map.class);
                System.out.println(" Payment triggered for passenger " + passenger.getRiderId());
            } catch (Exception e) {
                System.err.println("  Payment service unavailable");
            }
        }).start();
    }
    
    /**
     * Call matching service
     */
    private void callMatchingService(RideRequest request) {
        String matchingServiceUrl = "http://localhost:8083/api/matching/find-match";
        
        Map<String, Object> payload = new HashMap<>();
        payload.put("requestId", request.getId());
        payload.put("pickupLocation", request.getPickupLocation());
        payload.put("dropLocation", request.getDropLocation());
        
        new Thread(() -> {
            try {
                restTemplate.postForObject(matchingServiceUrl, payload, Map.class);
            } catch (Exception e) {
                System.out.println("Matching service unavailable");
            }
        }).start();
    }

    public Ride getRideById(Long rideId) {
        Ride ride = rideRepository.findById(rideId)
            .orElseThrow(() -> new RuntimeException("Ride not found with id: " + rideId));
        
        // Populate passengers
        List<RidePassenger> passengers = passengerRepository.findByRideId(ride.getId());
        ride.setPassengers(passengers);
        
        return ride;
    }

    /**
     * Get passenger by ID
     */
    public RidePassenger getPassengerById(Long passengerId) {
        return passengerRepository.findById(passengerId)
            .orElseThrow(() -> new RuntimeException("Passenger not found with id: " + passengerId));
    }

    /**
     * Delete all rides - For testing/debugging only
     */
    public void deleteAllRides() {
        passengerRepository.deleteAll();
        requestRepository.deleteAll();
        rideRepository.deleteAll();
    }
    // --- SEGMENT HELPERS ---
    
    private int[] findSegmentRange(Ride ride, double pLat, double pLon, double dLat, double dLon) {
         List<RouteSegment> segments = ride.getSegments();
         if (segments == null || segments.isEmpty()) return new int[]{-1, -1};
         
         int start = -1;
         int end = -1;
         double minStart = Double.MAX_VALUE;
         double minEnd = Double.MAX_VALUE;
         
         for (int i = 0; i < segments.size(); i++) {
             RouteSegment seg = segments.get(i);
             // dist to start
             double dS = mapDistanceUtil.calculateDistance(pLat, pLon, seg.getStartLat(), seg.getStartLng());
             if (dS < minStart) { minStart = dS; start = i; }
             
             // dist to end
             double dE = mapDistanceUtil.calculateDistance(dLat, dLon, seg.getEndLat(), seg.getEndLng());
             if (dE < minEnd) { minEnd = dE; end = i; }
         }
         return new int[]{start, end};
    }
    
    private double calculatePreliminaryFare(Ride ride, int startIdx, int endIdx) {
        double total = 0.0;
        List<RouteSegment> segs = ride.getSegments();
        if (startIdx >= 0 && endIdx < segs.size() && startIdx <= endIdx) {
            for (int i = startIdx; i <= endIdx; i++) {
                RouteSegment s = segs.get(i);
                total += s.getDistanceInKm() * s.getBaseRatePerKm();
            }
        }
        return total;
    }
    /**
     * Get all rides for a rider (History)
     */
    public List<Map<String, Object>> getRidesByRider(Long riderId) {
        // 1. Find all instances where user was a passenger
        List<RidePassenger> passengerRecords = passengerRepository.findByRiderId(riderId);
        
        List<Map<String, Object>> history = new ArrayList<>();
        
        for (RidePassenger p : passengerRecords) {
            Map<String, Object> rideData = new HashMap<>();
            
            // 2. Fetch ride details
            rideRepository.findById(p.getRideId()).ifPresent(ride -> {
                rideData.put("id", ride.getId());
                rideData.put("driverName", ride.getDriverName());
                // rideData.put("driverRating", ride.getDriverRating()); // If available
                // Use passenger specific locations if possible, else ride locations
                rideData.put("pickupLocation", p.getBoardingLocation() != null ? p.getBoardingLocation() : ride.getPickupLocation());
                rideData.put("dropLocation", p.getDropLocation() != null ? p.getDropLocation() : ride.getDropLocation());
                
                rideData.put("status", p.getStatus()); // Use passenger status (e.g., DROPPED)
                rideData.put("fare", p.getFareAmount());
                // rideData.put("distance", p.getDistance()); // If stored
                rideData.put("completedAt", ride.getCreatedAt()); // Or actual completion time
                
                history.add(rideData);
            });
        }
        
        return history;
    }
}