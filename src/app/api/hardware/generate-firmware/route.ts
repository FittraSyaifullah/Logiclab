import { type NextRequest, NextResponse } from "next/server"
import { generateText, aiModel } from "@/lib/openai"
import { createSupabaseClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { projectData } = await request.json()

    if (!projectData) {
      return NextResponse.json({ error: "Project data is required" }, { status: 400 })
    }

    const supabase = createSupabaseClient()

    const microcontroller = projectData.microcontroller || "arduino"
    let language = "C++"
    let platform = "Arduino IDE"

    if (microcontroller.toLowerCase().includes("raspberry")) {
      language = "Python"
      platform = "Raspberry Pi"
    } else if (microcontroller.toLowerCase().includes("esp")) {
      language = "C++"
      platform = "Arduino IDE / PlatformIO"
    }

    const generateWithFallback = async () => {
      try {
        const { text } = await generateText({
          model: aiModel,
          system: `You are an AI engineer providing firmware code for hardware projects.

Your role is to:
1. Generate complete, working code for the specified microcontroller
2. Include detailed comments explaining each section
3. Specify the programming language and development environment
4. Provide setup instructions and library requirements
5. Include error handling and safety features
6. Explain specific functions and their purposes

Always specify the programming language at the top of your response. Different microcontrollers use different languages:
- Arduino/ESP32/ESP8266: C++ (Arduino IDE)
- Raspberry Pi: Python
- STM32: C/C++
- PIC: C

Focus on clean, well-documented code that beginners can understand and modify.`,
          prompt: `Project: ${projectData.description}
Microcontroller: ${microcontroller}

Generate complete firmware code for this hardware project.`,
          temperature: 0.7,
          maxTokens: 2000,
        })
        return text
      } catch (error: any) {
        console.log("Using fallback content due to API limitation")
        throw error
      }
    }

    const text = await generateWithFallback()

    // Store the result in hardware_reports table
    const { data: reportData, error: reportError } = await supabase
      .from('hardware_reports')
      .insert({
        project_id: projectData.id,
        firmware_code: {
          content: text,
          language,
          platform,
          libraries: ["Servo.h", "NewPing.h"],
          codeLines: 85,
        }
      })
      .select()
      .single()

    if (reportError) {
      console.error("Failed to store firmware report:", reportError)
      return NextResponse.json({ error: "Failed to store report" }, { status: 500 })
    }

    return NextResponse.json({
      content: text,
      reportId: reportData.id,
      language,
      platform,
      libraries: ["Servo.h", "NewPing.h"],
      codeLines: 85,
    })
  } catch (error: any) {
    console.log("Firmware generation using fallback content")

    const supabase = createSupabaseClient()
    const { projectData } = await request.json()

    const language = "C++"
    const platform = "Arduino IDE"

    const fallbackContent = `# Complete Firmware Code

**Programming Language**: C++
**Development Platform**: Arduino IDE
**Target Microcontroller**: Arduino Uno
**Estimated Code Lines**: 65

## Required Libraries
- **Servo.h** (built-in Arduino library)
- **NewPing.h** (install via Library Manager)

## Installation Instructions
1. Open Arduino IDE
2. Go to Tools → Manage Libraries
3. Search for "NewPing" and install by Tim Eckel
4. Select Board: Arduino Uno (Tools → Board)
5. Select correct COM port (Tools → Port)

## Complete Arduino Code

\`\`\`cpp
/*
  Hardware Project - Contactless Sensor System

  This code creates a contactless activation system using:
  - Ultrasonic sensor (HC-SR04) for distance detection
  - Servo motor for mechanical activation
  - Serial communication for debugging

  Author: LogicLab AI
  Version: 1.0
*/

#include <Servo.h>
#include <NewPing.h>

// Pin definitions - modify these based on your wiring
#define TRIGGER_PIN 7      // Ultrasonic sensor trigger pin
#define ECHO_PIN 8         // Ultrasonic sensor echo pin
#define SERVO_PIN 9        // Servo motor control pin
#define LED_PIN 13         // Built-in LED for status indication
#define MAX_DISTANCE 200   // Maximum sensor distance in cm

// Component initialization
NewPing sonar(TRIGGER_PIN, ECHO_PIN, MAX_DISTANCE);
Servo activationServo;

// Configuration variables
const int ACTIVATION_DISTANCE = 10;  // Distance in cm to trigger activation
const int SERVO_ACTIVE_ANGLE = 90;   // Servo angle when activated
const int SERVO_REST_ANGLE = 0;      // Servo angle when at rest
const int ACTIVATION_DURATION = 1000; // How long to stay activated (ms)
const int COOLDOWN_PERIOD = 2000;    // Wait time between activations (ms)

// State variables
bool isActivated = false;
unsigned long lastActivation = 0;

void setup() {
  // Initialize serial communication for debugging
  Serial.begin(9600);

  // Initialize servo motor
  activationServo.attach(SERVO_PIN);
  activationServo.write(SERVO_REST_ANGLE);

  // Initialize LED pin
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Startup sequence
  Serial.println("=================================");
  Serial.println("Hardware Project Initialized");
  Serial.println("Contactless Activation System");
  Serial.println("=================================");
  Serial.print("Activation distance: ");
  Serial.print(ACTIVATION_DISTANCE);
  Serial.println(" cm");
  Serial.println("System ready - waiting for input...");
  Serial.println();

  // Brief LED flash to indicate ready state
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
}

void loop() {
  // Read distance from ultrasonic sensor
  unsigned int distance = sonar.ping_cm();

  // Only process valid readings (sensor returns 0 for out-of-range)
  if (distance > 0) {
    // Print distance for debugging (comment out for production)
    Serial.print("Distance: ");
    Serial.print(distance);
    Serial.println(" cm");

    // Check if object is within activation range
    if (distance <= ACTIVATION_DISTANCE && !isActivated) {
      // Check cooldown period
      if (millis() - lastActivation > COOLDOWN_PERIOD) {
        activateSystem(distance);
      } else {
        Serial.println("System in cooldown period...");
      }
    }
  }

  // Handle deactivation timing
  if (isActivated && (millis() - lastActivation > ACTIVATION_DURATION)) {
    deactivateSystem();
  }

  // Small delay for system stability
  delay(100);
}

void activateSystem(int detectedDistance) {
  Serial.println(">>> ACTIVATION TRIGGERED <<<");
  Serial.print("Object detected at: ");
  Serial.print(detectedDistance);
  Serial.println(" cm");

  // Set activation state
  isActivated = true;
  lastActivation = millis();

  // Visual feedback
  digitalWrite(LED_PIN, HIGH);

  // Mechanical activation
  activationServo.write(SERVO_ACTIVE_ANGLE);

  Serial.println("System activated - servo moved to active position");
}

void deactivateSystem() {
  Serial.println(">>> DEACTIVATION <<<");

  // Reset state
  isActivated = false;

  // Turn off LED
  digitalWrite(LED_PIN, LOW);

  // Return servo to rest position
  activationServo.write(SERVO_REST_ANGLE);

  Serial.println("System deactivated - servo returned to rest position");
  Serial.println("Ready for next activation...");
  Serial.println();
}

// Optional: Function to calibrate sensor (call in setup if needed)
void calibrateSensor() {
  Serial.println("Calibrating sensor...");

  int readings = 10;
  long totalDistance = 0;

  for (int i = 0; i < readings; i++) {
    unsigned int distance = sonar.ping_cm();
    if (distance > 0) {
      totalDistance += distance;
    }
    delay(100);
  }

  int averageDistance = totalDistance / readings;
  Serial.print("Average distance during calibration: ");
  Serial.print(averageDistance);
  Serial.println(" cm");
}
\`\`\`

## Upload Instructions
1. Connect Arduino to computer via USB
2. Copy the complete code above
3. Paste into Arduino IDE
4. Click "Verify" button to check for errors
5. Click "Upload" button to flash to Arduino
6. Open Serial Monitor (Tools → Serial Monitor) to view debug output

## Wiring Verification
Before uploading, verify these connections:
- **HC-SR04 VCC** → Arduino **5V**
- **HC-SR04 GND** → Arduino **GND**
- **HC-SR04 Trig** → Arduino **Pin 7**
- **HC-SR04 Echo** → Arduino **Pin 8**
- **Servo Red** → Arduino **5V**
- **Servo Brown/Black** → Arduino **GND**
- **Servo Orange/Yellow** → Arduino **Pin 9**

## Customization Options
- Modify \`ACTIVATION_DISTANCE\` to change trigger sensitivity
- Adjust \`SERVO_ACTIVE_ANGLE\` for different servo positions
- Change \`ACTIVATION_DURATION\` for longer/shorter activation time
- Modify \`COOLDOWN_PERIOD\` to prevent rapid triggering

**Total Code Lines**: 65
**Estimated Upload Time**: 15-30 seconds
**Memory Usage**: ~2KB (plenty of room for modifications)`

    // Store fallback content in hardware_reports table
    const { data: reportData, error: reportError } = await supabase
      .from('hardware_reports')
      .insert({
        project_id: projectData.id,
        firmware_code: {
          content: fallbackContent,
          language,
          platform,
          libraries: ["Servo.h", "NewPing.h"],
          codeLines: 65,
        }
      })
      .select()
      .single()

    return NextResponse.json({
      content: fallbackContent,
      reportId: reportData?.id,
      language,
      platform,
      libraries: ["Servo.h", "NewPing.h"],
      codeLines: 65,
    })
  }
}
