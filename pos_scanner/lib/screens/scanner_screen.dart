import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:flutter/services.dart';
import 'package:vibration/vibration.dart';
import 'package:permission_handler/permission_handler.dart';
import '../services/camera_service.dart';
import '../services/barcode_service.dart';
import '../services/api_service.dart';
import 'package:audioplayers/audioplayers.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({Key? key}) : super(key: key);

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final CameraService _cameraService = CameraService();
  final BarcodeService _barcodeService = BarcodeService();
  final ApiService _apiService = ApiService();
  final AudioPlayer _audioPlayer = AudioPlayer();
  
  @override
  void initState() {
    super.initState();
    _initializeAudio();
    _initializeCamera();
  }

  void _initializeAudio() {
    // Optimized for short scanner beeps
    _audioPlayer.setReleaseMode(ReleaseMode.stop);
    _audioPlayer.setPlayerMode(PlayerMode.lowLatency);
    _audioPlayer.setVolume(1.0); // Full volume
  }
  
  bool _isInitialized = false;
  bool _isScanning = false;
  bool _isProcessing = false;
  String? _lastScannedBarcode;
  String _statusMessage = 'Initializing camera...';
  Color _statusColor = Colors.blue;
  int _lastProcessTime = 0;
  final int _scanIntervalMs = 200; 
  bool _isHoldScanning = false;
  bool _shouldScanTrigger = false;


  Future<void> _initializeCamera() async {
    try {
      final status = await Permission.camera.request();
      if (!status.isGranted) {
        setState(() {
          _statusMessage = 'Camera permission denied';
          _statusColor = Colors.red;
        });
        return;
      }
      
      await _cameraService.initialize();
      
      setState(() {
        _isInitialized = true;
        _statusMessage = 'Ready to scan';
        _statusColor = Colors.green;
      });
      
      _startScanning(); // Auto-start the stream, but it will wait for trigger
    } catch (e) {
      setState(() {
        _statusMessage = 'Error: $e';
        _statusColor = Colors.red;
      });
    }
  }
  
  bool _isStreamActive = false;

  void _startScanning() async {
    if (_cameraService.controller == null || _isStreamActive) return;
    
    _isStreamActive = true;
    
    try {
      setState(() {
         _isScanning = true;
         _isHoldScanning = false;
         _lastScannedBarcode = null;
         _statusMessage = 'Scanning...';
         _statusColor = Colors.green;
      });

      await _cameraService.controller!.startImageStream((CameraImage image) async {
        if (!_isStreamActive || _isHoldScanning || _isProcessing || !_shouldScanTrigger) return;
        
        // Debounce frame processing
        final currentTime = DateTime.now().millisecondsSinceEpoch;
        if (currentTime - _lastProcessTime < _scanIntervalMs) return;
        
        _isProcessing = true;
        _lastProcessTime = currentTime;
        
        try {
          final rotation = _cameraService.getImageRotation();
          final barcodes = await _barcodeService.scanImage(image, rotation);
          
          if (barcodes.isNotEmpty && !_isHoldScanning && _shouldScanTrigger) {
            final barcode = barcodes.first;
            if (barcode.rawValue != null) {
              _shouldScanTrigger = false; // Reset trigger once barcode found
              _handleBarcodeDetected(barcode.rawValue!);
            }
          }
        } catch (e) {
          print('Scanning error: $e');
        } finally {
          _isProcessing = false;
        }
      });
    } catch (e) {
       _isStreamActive = false;
       print("Error starting stream: $e");
    }
  }

  void _handleBarcodeDetected(String barcode) async {
    if (_isHoldScanning) return;
    
    setState(() {
      _isHoldScanning = true;
      _statusMessage = 'Processing: $barcode';
      _statusColor = Colors.orange;
    });
    
    // Vibrate & Beep (Non-blocking)
    _provideSuccessFeedback();

    // Send to API with timeout and error handling
    try {
      final result = await _apiService.sendBarcode(barcode).timeout(
        const Duration(seconds: 5),
        onTimeout: () => throw 'Connection timeout',
      );
      
      if (result.success && result.product != null) {
        setState(() {
          _statusMessage = 'Added: ${result.product!.name} - \$${result.product!.price}';
          _statusColor = Colors.green;
        });
        _showSuccessDialog(result.product!.name, result.product!.price);
      } else {
        setState(() {
          _statusMessage = result.message;
          _statusColor = Colors.red;
        });
        _showErrorDialog(result.message);
      }
    } catch (e) {
      print('DEBUG: API Error: $e');
      setState(() {
        _statusMessage = 'Error connecting to server';
        _statusColor = Colors.red;
      });
      _showErrorDialog('Connection error. Is the server running?');
    }
  }
  
  void _resumeScanning() {
    if (mounted) {
      setState(() {
        _isHoldScanning = false;
        _shouldScanTrigger = false;
        _statusMessage = 'Tap button to scan';
        _statusColor = Colors.green;
      });
    }
  }

  void _showSuccessDialog(String productName, double price) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        backgroundColor: Colors.green.shade50,
        title: Row(
          children: const [
            Icon(Icons.check_circle, color: Colors.green, size: 32),
            SizedBox(width: 12),
            Text('Product Added', style: TextStyle(color: Colors.green)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(productName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('\$${price.toStringAsFixed(2)}', style: TextStyle(fontSize: 24, color: Colors.green.shade700, fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _resumeScanning();
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
    
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted && Navigator.canPop(context)) {
        Navigator.pop(context);
        _resumeScanning();
      }
    });
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        backgroundColor: Colors.red.shade50,
        title: Row(
          children: const [
            Icon(Icons.error, color: Colors.red, size: 32),
            SizedBox(width: 12),
            Text('Error', style: TextStyle(color: Colors.red)),
          ],
        ),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _resumeScanning();
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
    
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted && Navigator.canPop(context)) {
        Navigator.pop(context);
        _resumeScanning();
      }
    });
  }
  


  void _provideSuccessFeedback() {
    print('DEBUG: Providing success feedback');
    
    // 1. Vibrate
    Vibration.hasVibrator().then((hasVibrator) {
      if (hasVibrator == true) {
        Vibration.vibrate(duration: 150);
      }
    });

    // 2. Custom Beep (Low Latency WAV)
    // Re-set volume to ensure it's maxed
    _audioPlayer.setVolume(1.0);
    _audioPlayer.stop().then((_) {
      print('DEBUG: Playing custom sound: store-scanner-beep.wav');
      return _audioPlayer.play(AssetSource('store-scanner-beep-90395.wav'));
    }).catchError((e) {
      print('DEBUG: Error playing scan sound: $e');
    });
  }

  @override
  void dispose() {
    _cameraService.controller?.stopImageStream();
    _cameraService.dispose();
    _barcodeService.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Camera Preview
          if (_isInitialized && _cameraService.controller != null)
            SizedBox.expand(
              child: CameraPreview(_cameraService.controller!),
            )
          else
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(color: Colors.white),
                  const SizedBox(height: 20),
                  Text(
                    _statusMessage,
                    style: const TextStyle(color: Colors.white, fontSize: 16),
                  ),
                ],
              ),
            ),
          
          // Scan Overlay
          if (_isInitialized)
            CustomPaint(
              painter: ScannerOverlayPainter(),
              child: Container(),
            ),
          
          // Top Bar
          SafeArea(
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.7),
                    Colors.transparent,
                  ],
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'POS Scanner',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: _isScanning ? Colors.green : Colors.grey,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: _isScanning ? Colors.white : Colors.red,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              _isScanning ? 'SCANNING' : 'IDLE',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          
          // Bottom Status Bar
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.8),
                    Colors.transparent,
                  ],
                ),
              ),
              child: SafeArea(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: _statusColor.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: _statusColor, width: 2),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _statusColor == Colors.green ? Icons.check_circle :
                        _statusColor == Colors.red ? Icons.error :
                        Icons.info,
                        color: _statusColor,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _statusMessage,
                          style: TextStyle(
                            color: _statusColor,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          
          // Manual Scan Trigger / Button
          if (_isInitialized)
            Positioned(
              bottom: 150,
              left: 0,
              right: 0,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    GestureDetector(
                      onTap: () {
                        if (_isHoldScanning) {
                          _resumeScanning();
                        } else {
                          setState(() {
                            _shouldScanTrigger = true;
                            _statusMessage = 'Scanning for barcode...';
                            _statusColor = Colors.orange;
                          });
                          // Visual/Tactile feedback removed for cleaner experience
                          // Only beep on actual detection now
                        }
                      },
                      child: Container(
                        width: 90,
                        height: 90,
                        decoration: BoxDecoration(
                          color: _shouldScanTrigger || _isHoldScanning ? Colors.deepPurple : Colors.white.withValues(alpha: 0.9),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.deepPurple, width: 4),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.deepPurple.withValues(alpha: 0.5),
                              blurRadius: 20,
                              spreadRadius: 5,
                            )
                          ],
                        ),
                        child: Icon(
                          _isHoldScanning ? Icons.refresh : (_shouldScanTrigger ? Icons.sync : Icons.qr_code_scanner),
                          color: _shouldScanTrigger || _isHoldScanning ? Colors.white : Colors.deepPurple,
                          size: 45,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _isHoldScanning 
                        ? 'TAP TO RESET' 
                        : (_shouldScanTrigger ? 'SCANNING...' : 'TAP BUTTON TO SCAN'),
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.7),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          

        ],
      ),
    );
  }
}

// Scanner Overlay Painter
class ScannerOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withValues(alpha: 0.5)
      ..style = PaintingStyle.fill;
    
    final scanAreaSize = size.width * 0.7;
    final scanAreaLeft = (size.width - scanAreaSize) / 2;
    final scanAreaTop = (size.height - scanAreaSize) / 2;
    
    // Draw dark overlay with cutout
    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
      ..addRRect(RRect.fromRectAndRadius(
        Rect.fromLTWH(scanAreaLeft, scanAreaTop, scanAreaSize, scanAreaSize),
        const Radius.circular(20),
      ))
      ..fillType = PathFillType.evenOdd;
    
    canvas.drawPath(path, paint);
    
    // Draw corner markers
    final cornerPaint = Paint()
      ..color = Colors.deepPurple
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    
    final cornerLength = 40.0;
    
    // Top-left corner
    canvas.drawLine(
      Offset(scanAreaLeft, scanAreaTop + cornerLength),
      Offset(scanAreaLeft, scanAreaTop),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(scanAreaLeft, scanAreaTop),
      Offset(scanAreaLeft + cornerLength, scanAreaTop),
      cornerPaint,
    );
    
    // Top-right corner
    canvas.drawLine(
      Offset(scanAreaLeft + scanAreaSize - cornerLength, scanAreaTop),
      Offset(scanAreaLeft + scanAreaSize, scanAreaTop),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(scanAreaLeft + scanAreaSize, scanAreaTop),
      Offset(scanAreaLeft + scanAreaSize, scanAreaTop + cornerLength),
      cornerPaint,
    );
    
    // Bottom-left corner
    canvas.drawLine(
      Offset(scanAreaLeft, scanAreaTop + scanAreaSize - cornerLength),
      Offset(scanAreaLeft, scanAreaTop + scanAreaSize),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(scanAreaLeft, scanAreaTop + scanAreaSize),
      Offset(scanAreaLeft + cornerLength, scanAreaTop + scanAreaSize),
      cornerPaint,
    );
    
    // Bottom-right corner
    canvas.drawLine(
      Offset(scanAreaLeft + scanAreaSize - cornerLength, scanAreaTop + scanAreaSize),
      Offset(scanAreaLeft + scanAreaSize, scanAreaTop + scanAreaSize),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(scanAreaLeft + scanAreaSize, scanAreaTop + scanAreaSize - cornerLength),
      Offset(scanAreaLeft + scanAreaSize, scanAreaTop + scanAreaSize),
      cornerPaint,
    );
  }
  
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}