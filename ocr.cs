using System;
using System.IO;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Storage;

class Program {
    static void Main(string[] args) {
        if (args.Length == 0) {
            Console.WriteLine("Please specify an image path.");
            return;
        }
        string imagePath = args[0];
        try {
            RecognizeText(imagePath);
        } catch (Exception ex) {
            Console.WriteLine("Error: " + ex.ToString());
        }
    }

    static void RecognizeText(string imagePath) {
        var fileOp = StorageFile.GetFileFromPathAsync(imagePath);
        while (fileOp.Status == Windows.Foundation.AsyncStatus.Started) {
            System.Threading.Thread.Sleep(10);
        }
        var file = fileOp.GetResults();

        var streamOp = file.OpenAsync(FileAccessMode.Read);
        while (streamOp.Status == Windows.Foundation.AsyncStatus.Started) {
            System.Threading.Thread.Sleep(10);
        }
        var stream = streamOp.GetResults();

        var decoderOp = BitmapDecoder.CreateAsync(stream);
        while (decoderOp.Status == Windows.Foundation.AsyncStatus.Started) {
            System.Threading.Thread.Sleep(10);
        }
        var decoder = decoderOp.GetResults();

        var bitmapOp = decoder.GetSoftwareBitmapAsync();
        while (bitmapOp.Status == Windows.Foundation.AsyncStatus.Started) {
            System.Threading.Thread.Sleep(10);
        }
        using (var bitmap = bitmapOp.GetResults()) {
            var engine = OcrEngine.TryCreateFromUserProfileLanguages();
            if (engine == null) {
                Console.WriteLine("Engine is null");
                return;
            }
            var resultOp = engine.RecognizeAsync(bitmap);
            while (resultOp.Status == Windows.Foundation.AsyncStatus.Started) {
                System.Threading.Thread.Sleep(10);
            }
            var result = resultOp.GetResults();
            Console.WriteLine("Width: " + bitmap.PixelWidth + ", Height: " + bitmap.PixelHeight);
            Console.WriteLine("---OCR START---");
            foreach (var line in result.Lines) {
                Console.Write("Line: \"" + line.Text + "\" [");
                foreach (var word in line.Words) {
                    Console.Write("'" + word.Text + "'(" + (int)word.BoundingRect.Left + "," + (int)word.BoundingRect.Top + "," + (int)word.BoundingRect.Width + "," + (int)word.BoundingRect.Height + ") ");
                }
                Console.WriteLine("]");
            }
            Console.WriteLine("---OCR END---");
        }
    }
}
