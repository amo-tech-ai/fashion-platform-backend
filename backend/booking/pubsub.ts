import { Topic } from "encore.dev/pubsub";
import type { Booking } from "./types";

export const bookingTopic = new Topic<Booking>("new-booking", {});
