package carpool.ride.repository;

import carpool.ride.entity.RouteSegment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RouteSegmentRepository extends JpaRepository<RouteSegment, Long> {
    List<RouteSegment> findByRideIdOrderBySequenceOrderAsc(Long rideId);
}
