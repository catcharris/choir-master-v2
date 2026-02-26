require 'xcodeproj'
project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Find App group
app_group = project.main_group.find_subpath('App', true)

# Create file references
swift_ref = app_group.new_reference('WatchBridgePlugin.swift')
m_ref = app_group.new_reference('WatchBridgePlugin.m')

# Add to App target
app_target = project.targets.find { |t| t.name == 'App' }
app_target.source_build_phase.add_file_reference(swift_ref)
app_target.source_build_phase.add_file_reference(m_ref)
project.save
puts "Files added successfully!"
