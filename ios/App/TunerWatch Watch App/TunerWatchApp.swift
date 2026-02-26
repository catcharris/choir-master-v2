//
//  TunerWatchApp.swift
//  TunerWatch Watch App
//
//  Created by Lemonpapa on 2/25/26.
//

import SwiftUI

@main
struct TunerWatch_Watch_AppApp: App {
    init() {
        WatchBridge.shared.start()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
