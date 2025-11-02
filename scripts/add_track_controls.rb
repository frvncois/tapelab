#!/usr/bin/env ruby

require 'xcodeproj'

project_path = File.expand_path('../ios/tapelab.xcodeproj', __dir__)
project = Xcodeproj::Project.open(project_path)

# Get the main target
target = project.targets.find { |t| t.name == 'tapelab' }

# Create TrackControls group if it doesn't exist
track_controls_group = project.main_group.find_subpath('TrackControls', true)
track_controls_group.set_source_tree('<group>')
track_controls_group.set_path('../TrackControls')

# Add source files
swift_file = track_controls_group.new_file('../TrackControls/TrackSliderView.swift')
m_file = track_controls_group.new_file('../TrackControls/TrackSliderViewManager.m')

# Add files to compile phase
target.source_build_phase.add_file_reference(swift_file)
target.source_build_phase.add_file_reference(m_file)

project.save

puts "✅ Added TrackControls files to Xcode project"
