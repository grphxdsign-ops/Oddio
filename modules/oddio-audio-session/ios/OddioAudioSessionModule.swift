import AVFoundation
import CoreMIDI
import ExpoModulesCore

public class OddioAudioSessionModule: Module {
  private lazy var midiAvailable: Bool = hasMidiClient()

  public func definition() -> ModuleDefinition {
    Name("OddioAudioSession")

    Function("getStatus") {
      return self.statusPayload(label: "Swift bridge ready")
    }

    AsyncFunction("preparePracticeSession") { (mode: String) in
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetooth])
      try session.setPreferredSampleRate(44_100)
      try session.setPreferredIOBufferDuration(0.005)
      try session.setActive(true)

      let label = mode == "midi" ? "Swift MIDI-ready session" : "Swift mic-ready session"
      return self.statusPayload(label: label)
    }
  }

  private func statusPayload(label: String) -> [String: Any] {
    return [
      "available": true,
      "label": label,
      "platform": "ios",
      "supportsMidi": midiAvailable,
      "supportsLowLatencyAudio": true
    ]
  }

  private func hasMidiClient() -> Bool {
    var client = MIDIClientRef()
    let status = MIDIClientCreateWithBlock("OddioAI MIDI Client" as CFString, &client) { _ in }

    if status == noErr {
      MIDIClientDispose(client)
      return true
    }

    return false
  }
}
