import { api, StreamOut } from "encore.dev/api";
import { Subscription } from "encore.dev/pubsub";
import { bookingTopic } from "~backend/booking/pubsub";
import type { Booking } from "~backend/booking/types";

interface EventUpdate {
  type: 'booking';
  data: Booking;
}

// Map of eventId to a set of client streams
const streams = new Map<number, Set<StreamOut<EventUpdate>>>();

// Subscribe to new bookings
new Subscription(bookingTopic, "push-booking-updates", {
  handler: async (booking) => {
    const eventStreams = streams.get(booking.eventId);
    if (eventStreams) {
      for (const stream of eventStreams) {
        try {
          await stream.send({ type: 'booking', data: booking });
        } catch (e) {
          // Client disconnected, remove from set
          eventStreams.delete(stream);
        }
      }
    }
  },
});

// WebSocket support for live dashboard updates
export const subscribeToEventUpdates = api.streamOut<{ eventId: number }, EventUpdate>(
  { path: "/events/:eventId/subscribe", expose: true },
  async ({ eventId }, stream) => {
    if (!streams.has(eventId)) {
      streams.set(eventId, new Set());
    }
    streams.get(eventId)!.add(stream);

    // When the client disconnects, remove the stream
    stream.onClose(() => {
      const eventStreams = streams.get(eventId);
      if (eventStreams) {
        eventStreams.delete(stream);
        if (eventStreams.size === 0) {
          streams.delete(eventId);
        }
      }
    });

    // Keep the stream open indefinitely, until the client closes it.
    await new Promise(() => {});
  }
);
