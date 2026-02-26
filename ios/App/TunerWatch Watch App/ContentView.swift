import SwiftUI
import WatchConnectivity
import Foundation
import Combine

class WatchBridge: NSObject, WCSessionDelegate, ObservableObject {
    static let shared = WatchBridge()
    
    @Published var pitch: String = "A4"
    @Published var cents: Double = 0.0
    @Published var isListening: Bool = false
    private var lastTimestamp: TimeInterval = 0
    
    private override init() {
        super.init()
    }
    
    func start() {
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
    }
    
    func sendCommand(_ command: String) {
        if WCSession.isSupported() {
            let message = ["command": command]
            if WCSession.default.isReachable {
                WCSession.default.sendMessage(message, replyHandler: { response in
                    print("WatchBridge: Command '\(command)' delivered successfully. Reply: \(response)")
                }) { error in
                    print("WatchBridge: sendMessage error '\(command)': \(error.localizedDescription). Falling back to transferUserInfo.")
                    WCSession.default.transferUserInfo(message)
                }
            } else {
                print("WatchBridge: WCSession unreachable. Queuing command '\(command)' via transferUserInfo.")
                WCSession.default.transferUserInfo(message)
            }
        }
    }
    
    private func processPayload(_ payload: [String: Any]) {
        DispatchQueue.main.async {
            let msgTimestamp = payload["timestamp"] as? TimeInterval ?? 0
            
            // Prevent stale slow messages (e.g. from updateApplicationContext)
            // from overwriting fresh fast messages (e.g. from sendMessage).
            if msgTimestamp > 0 && msgTimestamp < self.lastTimestamp {
                print("WatchBridge: Ignored stale payload (ts: \(msgTimestamp) < \(self.lastTimestamp))")
                return
            }
            if msgTimestamp > 0 {
                self.lastTimestamp = msgTimestamp
            }
            
            if let pitch = payload["pitch"] as? String {
                self.pitch = pitch
            }
            if let cents = payload["cents"] as? Double {
                self.cents = cents
            }
            if let isListening = payload["isListening"] as? Bool {
                self.isListening = isListening
            }
            print("WatchBridge: Processed payload - pitch: \(self.pitch), cents: \(self.cents), isListening: \(self.isListening)")
        }
    }
    
    // Process messages from iPhone immediately - WITH REPLY HANDLER
    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        print("WatchBridge: didReceiveMessage (WITH REPLY) called with payload keys: \(message.keys.joined(separator: ", "))")
        processPayload(message)
        replyHandler(["status": "delivered to watch"])
    }
    
    // Process messages from iPhone immediately - NO REPLY HANDLER
    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        print("WatchBridge: didReceiveMessage (NO REPLY) called with payload keys: \(message.keys.joined(separator: ", "))")
        processPayload(message)
    }
    
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        print("WatchBridge: didReceiveApplicationContext called with payload keys: \(applicationContext.keys.joined(separator: ", "))")
        processPayload(applicationContext)
    }
    
    // Fallback for transferUserInfo (simulator reliability)
    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
        print("WatchBridge: didReceiveUserInfo called with payload keys: \(userInfo.keys.joined(separator: ", "))")
        processPayload(userInfo)
    }
    
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        print("WatchBridge: session activation completed. state: \(activationState.rawValue), error: \(String(describing: error))")
        // First time activation, grab whatever context is already queued up
        if let context = session.receivedApplicationContext as? [String: Any], !context.isEmpty {
            processPayload(context)
        }
    }
}

// ========================================== //
// MARK: - UI Views
// ========================================== //

struct ContentView: View {
    @StateObject private var bridge = WatchBridge.shared
    @State private var breathingScale: CGFloat = 1.0
    @State private var previouslyPerfect: Bool = false
    
    var body: some View {
        ZStack {
            // Background Dynamic Atmosphere
            if bridge.isListening {
                RadialGradient(
                    gradient: Gradient(colors: [getColor(for: bridge.cents).opacity(0.5), Color.black]),
                    center: .center,
                    startRadius: 20,
                    endRadius: 100
                )
                .ignoresSafeArea()
            } else {
                RadialGradient(
                    gradient: Gradient(colors: [Color(red: 0.2, green: 0.8, blue: 0.6).opacity(0.3), Color.black]),
                    center: .center,
                    startRadius: 20,
                    endRadius: 100
                )
                .ignoresSafeArea()
            }
            
            VStack {
                if bridge.isListening {
                    activeTunerOverlay
                } else {
                    idleScreenOverlay
                }
            }
            // Frosted Glass Effect wrapping the entire body
            .padding()
            .background(.ultraThinMaterial)
            .cornerRadius(24)
            .padding(10)
        }
    }
    
    // MARK: - Active Tuner View
    private var activeTunerOverlay: some View {
        VStack(spacing: 8) {
            
            // 1) Main Pitch Note
            Text(bridge.pitch)
                .font(.system(size: 64, weight: .black, design: .rounded))
                .foregroundColor(getColor(for: bridge.cents))
                .shadow(color: getColor(for: bridge.cents).opacity(0.8), radius: 8) // Neon Glow
                .minimumScaleFactor(0.5)
                .lineLimit(1)
            
            // 2) Exact Cents Readout
            HStack(spacing: 2) {
                Text(String(format: "%+.1f", bridge.cents))
                    .font(.system(size: 18, weight: .bold, design: .monospaced))
                    .foregroundColor(getColor(for: bridge.cents))
                Text("cent")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.secondary)
            }
            
            // 3) Glassmorphic Dial Gauge
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Track Background (Glass)
                    Rectangle()
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 12)
                        .cornerRadius(6)
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(Color.white.opacity(0.2), lineWidth: 1)
                        )
                    
                    // Zero Center Mark
                    Rectangle()
                        .fill(Color.white.opacity(0.8))
                        .frame(width: 2, height: 16)
                        .position(x: geometry.size.width / 2, y: geometry.size.height / 2)
                    
                    // The Indicator Needle
                    Circle()
                        .fill(getColor(for: bridge.cents))
                        .shadow(color: getColor(for: bridge.cents), radius: 4)
                        .frame(width: 18, height: 18)
                        .position(
                            x: calculateDotPosition(width: geometry.size.width, cents: bridge.cents),
                            y: geometry.size.height / 2
                        )
                        .animation(.spring(response: 0.15, dampingFraction: 0.6), value: bridge.cents)
                }
            }
            .frame(height: 24)
            .padding(.horizontal, 8)
            
            // 4) High-Contrast Stop Button
            Button(action: { bridge.sendCommand("stop") }) {
                HStack(spacing: 6) {
                    Image(systemName: "square.fill")
                        .font(.system(size: 10, weight: .black))
                    Text("정지")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundColor(Color(red: 1.0, green: 0.4, blue: 0.5)) // Slightly softer red for the text
                .padding(.horizontal, 24)
                .padding(.vertical, 8)
                .background(.ultraThinMaterial)
                .cornerRadius(16)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color(red: 1.0, green: 0.4, blue: 0.5).opacity(0.5), lineWidth: 1)
                )
            }
            .buttonStyle(PlainButtonStyle())
            .padding(.top, 16)
            
        }
        .onChange(of: bridge.cents) { newCents in
            // Handle Haptic Feedback for hitting the "Perfect" zone (within +/- 10 cents bounds, but tighter)
            let isPerfect = abs(newCents) <= 5.0
            if isPerfect && !previouslyPerfect {
                // Just entered perfect zone
                WKInterfaceDevice.current().play(.click)
            }
            previouslyPerfect = isPerfect
        }
    }
    
    // MARK: - Idle Screen View
    private var idleScreenOverlay: some View {
        VStack(spacing: 16) {
            
            Image(systemName: "mic.circle.fill")
                .font(.system(size: 48, weight: .light))
                .foregroundColor(Color(red: 0.2, green: 0.8, blue: 0.6)) // Premium Mint
                .shadow(color: Color(red: 0.2, green: 0.8, blue: 0.6).opacity(0.6), radius: 10)
                .scaleEffect(breathingScale)
                .onAppear {
                    withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                        breathingScale = 1.08
                    }
                }
            
            Button(action: { bridge.sendCommand("start") }) {
                Text("시작")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Color(red: 0.2, green: 0.8, blue: 0.6))
                    .padding(.horizontal, 32)
                    .padding(.vertical, 12)
                    .background(.ultraThinMaterial)
                    .cornerRadius(20)
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color(red: 0.2, green: 0.8, blue: 0.6).opacity(0.4), lineWidth: 1)
                    )
            }
            .buttonStyle(PlainButtonStyle())

            Text("iPhone에서\n켜주셔도 됩니다")
                .multilineTextAlignment(.center)
                .font(.system(size: 11))
                .foregroundColor(.gray)
        }
    }
    
    // MARK: - UI Logic
    private func getColor(for cents: Double) -> Color {
        let absCents = abs(cents)
        if absCents <= 10 {
            return Color(red: 0.1, green: 0.9, blue: 0.5) // Neon Mint
        } else if absCents <= 30 {
            return Color(red: 1.0, green: 0.8, blue: 0.0) // Vivid Yellow
        } else {
            return Color(red: 1.0, green: 0.2, blue: 0.4) // Neon Pink/Red
        }
    }
    
    private func calculateDotPosition(width: CGFloat, cents: Double) -> CGFloat {
        // Safe check for div by zero and bounds
        guard width > 0 else { return 0 }
        let maxRange: Double = 50.0 // Limit display to +/- 50 cents
        let clampedCents = max(-maxRange, min(maxRange, cents))
        
        let center = width / 2
        let offset = (clampedCents / maxRange) * center
        return center + offset
    }
}

#Preview {
    ContentView()
}
