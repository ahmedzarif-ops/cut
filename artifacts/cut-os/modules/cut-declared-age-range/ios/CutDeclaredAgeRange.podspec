require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name             = 'CutDeclaredAgeRange'
  s.version          = package['version']
  s.summary          = 'Privacy-preserving Apple age-range bridge for CUT OS.'
  s.description      = 'Exposes the minimum Declared Age Range operations required by the adult-only CUT OS gate.'
  s.license          = { :type => 'Proprietary' }
  s.author           = 'CUT OS'
  s.homepage         = 'https://getcutos.com'
  s.platforms        = { :ios => '17.0' }
  s.swift_version    = '5.9'
  s.source           = { :git => 'https://github.com/ahmedzarif-ops/cut.git' }
  s.static_framework = true
  s.source_files     = '**/*.swift'

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
