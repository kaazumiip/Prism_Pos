import 'package:camera/camera.dart';
import 'package:google_mlkit_barcode_scanning/google_mlkit_barcode_scanning.dart';

class CameraService {
  CameraController? _cameraController;
  List<CameraDescription>? _cameras;
  
  Future<void> initialize() async {
    _cameras = await availableCameras();
    if (_cameras!.isEmpty) {
      throw Exception('No cameras available');
    }
    
    // Use back camera
    final camera = _cameras!.firstWhere(
      (camera) => camera.lensDirection == CameraLensDirection.back,
      orElse: () => _cameras!.first,
    );
    
    _cameraController = CameraController(
      camera,
      ResolutionPreset.medium,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.nv21,
    );
    
    await _cameraController!.initialize();
  }
  
  CameraController? get controller => _cameraController;
  
  InputImageRotation getImageRotation() {
    if (_cameraController == null) return InputImageRotation.rotation0deg;
    
    final camera = _cameraController!.description;
    final sensorOrientation = camera.sensorOrientation;
    
    InputImageRotation rotation;
    switch (sensorOrientation) {
      case 90:
        rotation = InputImageRotation.rotation90deg;
        break;
      case 180:
        rotation = InputImageRotation.rotation180deg;
        break;
      case 270:
        rotation = InputImageRotation.rotation270deg;
        break;
      default:
        rotation = InputImageRotation.rotation0deg;
    }
    
    return rotation;
  }
  
  Future<void> dispose() async {
    await _cameraController?.dispose();
  }
}