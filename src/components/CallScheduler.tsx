"use client";

import React, { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  ClockIcon,
  PhoneIcon,
  CheckCircleIcon,
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { format, addDays, setHours, setMinutes } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface Agent {
  id: string;
  name: string;
  image: string;
  speciality?: string;
  rating?: number;
  availability?: string;
  videoIntro?: string;
}

interface CallSchedulerProps {
  agents?: Agent[];
  selectedAgent?: Agent;
  onSchedule?: (schedule: ScheduleData) => void;
  className?: string;
}

interface ScheduleData {
  agentId: string;
  agentName: string;
  date: Date;
  time: string;
  duration: number;
}

const defaultAgents: Agent[] = [
  {
    id: "1",
    name: "Ama",
    image: "",
    speciality: "Emotional Strength",
    rating: 4.9,
  },
  {
    id: "2",
    name: "Celeste",
    image: "",
    speciality: "Personal Growth",
    rating: 4.8,
  },
  {
    id: "3",
    name: "Elena",
    image: "",
    speciality: "Spiritual Growth",
    rating: 5.0,
  },
  {
    id: "4",
    name: "Marcus",
    image: "",
    speciality: "Career Development",
    rating: 4.7,
  },
  {
    id: "5",
    name: "Sarah",
    image: "",
    speciality: "Wellness Coach",
    rating: 4.9,
  },
  {
    id: "6",
    name: "David",
    image: "",
    speciality: "Life Balance",
    rating: 4.6,
  },
  { id: "7", name: "Maya", image: "", speciality: "Mindfulness", rating: 5.0 },
  { id: "8", name: "James", image: "", speciality: "Leadership", rating: 4.8 },
  {
    id: "9",
    name: "Sophia",
    image: "",
    speciality: "Relationships",
    rating: 4.9,
  },
  {
    id: "10",
    name: "Michael",
    image: "",
    speciality: "Performance",
    rating: 4.7,
  },
  {
    id: "11",
    name: "Isabella",
    image: "",
    speciality: "Creativity",
    rating: 4.8,
  },
  {
    id: "12",
    name: "Robert",
    image: "",
    speciality: "Productivity",
    rating: 4.6,
  },
];

const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? "00" : "30";
  const time24 = `${hours.toString().padStart(2, "0")}:${minutes}`;
  const period = hours < 12 ? "AM" : "PM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const time12 = `${displayHours}:${minutes} ${period}`;
  return { value: time24, label: time12 };
});

export default function CallScheduler({
  agents = defaultAgents,
  selectedAgent,
  onSchedule,
  className,
}: CallSchedulerProps) {
  const [step, setStep] = useState<"schedule" | "confirm">("schedule");
  const [agent, setAgent] = useState<Agent | null>(
    selectedAgent || agents[0] || null,
  );
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string>("");
  const [duration, setDuration] = useState<string>("30");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!agent) newErrors.agent = "Please select an agent";
    if (!date) newErrors.date = "Please select a date";
    if (!time) newErrors.time = "Please select a time";
    if (!duration) newErrors.duration = "Please select a duration";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      setStep("confirm");
    }
  };

  const handleConfirm = () => {
    if (agent && date && time && duration) {
      const [hours, minutes] = time.split(":").map(Number);
      const scheduledDateTime = setMinutes(setHours(date, hours), minutes);

      const scheduleData: ScheduleData = {
        agentId: agent.id,
        agentName: agent.name,
        date: scheduledDateTime,
        time,
        duration: parseInt(duration),
      };

      onSchedule?.(scheduleData);

      // Reset form
      setStep("schedule");
      setAgent(null);
      setDate(undefined);
      setTime("");
      setDuration("30");
      setErrors({});
    }
  };

  const handleBack = () => {
    setStep("schedule");
  };

  const handlePreviousAgent = () => {
    const newIndex =
      currentAgentIndex === 0 ? agents.length - 1 : currentAgentIndex - 1;
    setCurrentAgentIndex(newIndex);
    setAgent(agents[newIndex]);
  };

  const handleNextAgent = () => {
    const newIndex =
      currentAgentIndex === agents.length - 1 ? 0 : currentAgentIndex + 1;
    setCurrentAgentIndex(newIndex);
    setAgent(agents[newIndex]);
  };

  return (
    <div className={cn("w-full max-w-7xl mx-auto", className)}>
      {step === "schedule" ? (
        <Card className="bg-white dark:bg-slate-900/90 backdrop-blur-sm border-gray-200 dark:border-slate-700 shadow-2xl">
          <CardHeader className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
            <CardTitle className="text-2xl text-gray-900 dark:text-white flex items-center gap-3">
              <CalendarIcon className="w-12 h-12 text-blue-500 dark:text-blue-400" />
              Schedule Your Call
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 text-base">
              Select your coach and preferred time for your session
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            {/* Compact Layout: Agent Selection with Calendar side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              {/* Left Column: Agent Selection */}
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-slate-800/70 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Select an Agent
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousAgent}
                        className="border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 h-8 w-8 p-0"
                      >
                        <ChevronLeftIcon className="w-4 h-4" />
                      </Button>
                      <span className="text-gray-600 dark:text-gray-400 text-sm px-2">
                        {currentAgentIndex + 1} / {agents.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextAgent}
                        className="border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 h-8 w-8 p-0"
                      >
                        <ChevronRightIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {agent && (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={agent.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        {/* Agent Image/Video */}
                        <div className="relative h-48 sm:h-56 lg:h-64">
                          {agent.videoIntro ? (
                            <video
                              src={agent.videoIntro}
                              className="w-full h-full object-cover rounded-lg"
                              controls
                              poster={agent.image || undefined}
                              onError={(e) => {
                                const videoElement = e.target as HTMLVideoElement;
                                videoElement.style.display = "none";
                                const container = videoElement.parentElement;
                                if (container && agent.image) {
                                  const img = document.createElement("img");
                                  img.src = agent.image;
                                  img.alt = agent.name;
                                  img.className = "w-full h-full object-cover rounded-lg";
                                  img.onerror = () => {
                                    img.src = "/placeholder-avatar.svg";
                                  };
                                  container.appendChild(img);
                                }
                              }}
                            />
                          ) : agent.image ? (
                            <img
                              src={agent.image}
                              alt={agent.name}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/placeholder-avatar.svg";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                              <UserIcon className="w-24 h-24 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Agent Info */}
                        <div className="space-y-2">
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                            {agent.name}
                          </h4>
                          <p className="text-gray-600 dark:text-gray-300">
                            {agent.speciality}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            {agent.rating && (
                              <div className="flex items-center gap-1">
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <StarIcon
                                      key={i}
                                      className={cn(
                                        "w-4 h-4",
                                        i < Math.floor(agent.rating || 0)
                                          ? "text-yellow-400 fill-yellow-400"
                                          : "text-gray-300 dark:text-gray-600"
                                      )}
                                    />
                                  ))}
                                </div>
                                <span className="text-gray-600 dark:text-gray-300 text-sm ml-1">
                                  {agent.rating.toFixed(1)}
                                </span>
                              </div>
                            )}
                            
                            <Badge className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/50 text-sm">
                              Available 24/7
                            </Badge>
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>

                {/* Time and Duration Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="time" className="text-gray-700 dark:text-white font-medium text-sm flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Time
                    </Label>
                    <select
                      id="time"
                      value={time}
                      onChange={(e) => {
                        setTime(e.target.value);
                        if (errors.time) {
                          setErrors({ ...errors, time: "" });
                        }
                      }}
                      className={cn(
                        "flex h-10 w-full rounded-lg border-2 px-3 py-2 text-sm font-medium",
                        "bg-white dark:bg-black text-gray-900 dark:text-white",
                        "border-gray-300 dark:border-blue-500/50",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
                        "transition-all duration-200",
                        errors.time && "border-red-500 focus:ring-red-500"
                      )}
                    >
                      <option value="" className="bg-white dark:bg-slate-900">
                        Select time
                      </option>
                      {timeSlots.map((slot) => (
                        <option
                          key={slot.value}
                          value={slot.value}
                          className="bg-white dark:bg-slate-900"
                        >
                          {slot.label}
                        </option>
                      ))}
                    </select>
                    {errors.time && (
                      <p className="text-red-400 text-xs">{errors.time}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration" className="text-gray-700 dark:text-white font-medium text-sm">
                      Duration
                    </Label>
                    <select
                      id="duration"
                      value={duration}
                      onChange={(e) => {
                        setDuration(e.target.value);
                        if (errors.duration) {
                          setErrors({ ...errors, duration: "" });
                        }
                      }}
                      className={cn(
                        "flex h-10 w-full rounded-lg border-2 px-3 py-2 text-sm font-medium",
                        "bg-white dark:bg-black text-gray-900 dark:text-white",
                        "border-gray-300 dark:border-blue-500/50",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
                        "transition-all duration-200",
                        errors.duration && "border-red-500 focus:ring-red-500"
                      )}
                    >
                      <option value="15" className="bg-white dark:bg-slate-900">
                        15 minutes
                      </option>
                      <option value="30" className="bg-white dark:bg-slate-900">
                        30 minutes
                      </option>
                      <option value="45" className="bg-white dark:bg-slate-900">
                        45 minutes
                      </option>
                      <option value="60" className="bg-white dark:bg-slate-900">
                        60 minutes
                      </option>
                    </select>
                    {errors.duration && (
                      <p className="text-red-400 text-xs">{errors.duration}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Calendar */}
              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-slate-800/70 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Select Date
                    </h3>
                    {date && (
                      <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        {format(date, "MMM d")}
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      "rounded-lg border bg-gray-50 dark:bg-slate-800/70 p-3 sm:p-4",
                      errors.date
                        ? "border-red-500"
                        : "border-gray-300 dark:border-slate-600",
                    )}
                  >
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      setDate(newDate);
                      if (errors.date) {
                        setErrors({ ...errors, date: "" });
                      }
                    }}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    className="bg-transparent w-full scheduler-calendar"
                    classNames={{
                      day_selected: "!bg-blue-500 !text-white hover:!bg-blue-600",
                      day: "rounded-lg transition-colors",
                      nav_button: "h-8 w-8 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 rounded-lg p-0 opacity-100 hover:opacity-100",
                      caption_label: "text-lg font-bold text-gray-900 dark:text-white",
                      head_cell: "text-gray-600 dark:text-gray-300 font-semibold text-sm",
                    }}
                  />
                  </div>
                  {errors.date && (
                    <p className="text-red-400 text-sm mt-1">{errors.date}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <div className="pt-4 sm:pt-6">
              <Button
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                size="lg"
              >
                Continue to Confirmation
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white dark:bg-slate-900/90 backdrop-blur-sm border-gray-200 dark:border-slate-700 shadow-2xl">
          <CardHeader className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
            <CardTitle className="text-2xl text-gray-900 dark:text-white flex items-center gap-3">
              <CheckCircleIcon className="w-12 h-12 text-green-400" />
              Confirm Your Call
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 text-base">
              Review your scheduled call details before confirming
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            {/* Summary Card */}
            <div className="bg-gray-50 dark:bg-slate-800/70 rounded-lg p-8 space-y-6 border border-gray-200 dark:border-slate-700">
              {agent && (
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                    <UserIcon className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {agent.name}
                    </h3>
                    {agent.speciality && (
                      <p className="text-gray-600 dark:text-gray-300 text-base">
                        {agent.speciality}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300 flex items-center gap-3 text-base">
                    <CalendarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    Date
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium text-base">
                    {date && format(date, "EEEE, MMMM d, yyyy")}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300 flex items-center gap-3 text-base">
                    <ClockIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    Time
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium text-base">
                    {timeSlots.find((t) => t.value === time)?.label}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300 flex items-center gap-3 text-base">
                    <PhoneIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    Duration
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium text-base">
                    {duration} minutes
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-slate-600">
                <Badge className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/50 px-4 py-2 text-base">
                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                  Agent Available 24/7
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={handleBack}
                variant="outline"
                className="flex-1 h-12 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 text-base font-medium"
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-base font-medium"
              >
                Confirm Call
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
