import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:google_mlkit_barcode_scanning/google_mlkit_barcode_scanning.dart';
import 'package:camera/camera.dart';

class BarcodeService {
  final BarcodeScanner _barcodeScanner = BarcodeScanner();
  
  Future<List<Barcode>> scanImage(CameraImage image, InputImageRotation rotation) async {
    final WriteBuffer allBytes = WriteBuffer();
    for (Plane plane in image.planes) {
      allBytes.putUint8List(plane.bytes);
    }
    final bytes = allBytes.done().buffer.asUint8List();

    final Size imageSize = Size(image.width.toDouble(), image.height.toDouble());

    final InputImageFormat inputImageFormat = 
        InputImageFormatValue.fromRawValue(image.format.raw) ?? 
        InputImageFormat.nv21;

    // Fixed for newer google_mlkit_commons 0.6.1+ / 0.9.0+
    final inputImageMetadata = InputImageMetadata(
      size: imageSize,
      rotation: rotation,
      format: inputImageFormat,
      bytesPerRow: image.planes[0].bytesPerRow,
    );

    final inputImage = InputImage.fromBytes(
      bytes: bytes,
      metadata: inputImageMetadata,
    );

    final List<Barcode> barcodes = await _barcodeScanner.processImage(inputImage);
    return barcodes;
  }

  void dispose() {
    _barcodeScanner.close();
  }
}