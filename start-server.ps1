param(
    [int]$StartPort = 8000,
    [string]$RootDirectory = ""
)

if ([string]::IsNullOrWhiteSpace($RootDirectory)) {
    if ($PSScriptRoot) {
        $RootDirectory = $PSScriptRoot
    } elseif ($MyInvocation.MyCommand.Path) {
        $RootDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
    } else {
        $RootDirectory = (Get-Location).Path
    }
}
$RootDirectory = [System.IO.Path]::GetFullPath($RootDirectory)

$csharpCode = @"
using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Collections.Generic;

public class SimpleWebServer
{
    private HttpListener _listener;
    private string _root;
    private int _port;
    private bool _running;
    private static readonly Dictionary<string, string> MimeTypes = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        { ".html", "text/html; charset=utf-8" },
        { ".htm", "text/html; charset=utf-8" },
        { ".css", "text/css; charset=utf-8" },
        { ".js", "application/javascript; charset=utf-8" },
        { ".mjs", "application/javascript; charset=utf-8" },
        { ".json", "application/json; charset=utf-8" },
        { ".png", "image/png" },
        { ".jpg", "image/jpeg" },
        { ".jpeg", "image/jpeg" },
        { ".gif", "image/gif" },
        { ".svg", "image/svg+xml" },
        { ".webp", "image/webp" },
        { ".ico", "image/x-icon" },
        { ".mp4", "video/mp4" },
        { ".webm", "video/webm" },
        { ".ogg", "video/ogg" },
        { ".glb", "model/gltf-binary" },
        { ".gltf", "model/gltf+json" },
        { ".bin", "application/octet-stream" },
        { ".wasm", "application/wasm" },
        { ".woff", "font/woff" },
        { ".woff2", "font/woff2" },
        { ".ttf", "font/ttf" },
        { ".otf", "font/otf" },
        { ".txt", "text/plain; charset=utf-8" }
    };

    public SimpleWebServer(string root)
    {
        _root = root.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
    }

    public int Start(int startPort)
    {
        for (int p = startPort; p <= startPort + 20; p++)
        {
            HttpListener listener = null;
            try
            {
                listener = new HttpListener();
                listener.Prefixes.Add("http://localhost:" + p + "/");
                listener.Start();
                _listener = listener;
                _port = p;
                _running = true;
                break;
            }
            catch
            {
                if (listener != null)
                {
                    try { listener.Close(); } catch { }
                }
            }
        }

        if (_listener == null)
        {
            throw new InvalidOperationException("Could not bind to any port in range " + startPort + "-" + (startPort + 20));
        }

        ThreadPool.QueueUserWorkItem(ListenLoop);
        return _port;
    }

    private void ListenLoop(object state)
    {
        while (_running && _listener != null && _listener.IsListening)
        {
            try
            {
                HttpListenerContext ctx = _listener.GetContext();
                ThreadPool.QueueUserWorkItem(ProcessRequest, ctx);
            }
            catch
            {
                if (!_running) break;
            }
        }
    }

    private void ProcessRequest(object state)
    {
        HttpListenerContext context = (HttpListenerContext)state;
        try
        {
            context.Response.Headers["Access-Control-Allow-Origin"] = "*";
            context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
            context.Response.Headers["Accept-Ranges"] = "bytes";

            string path = context.Request.Url.LocalPath;
            if (path == "/" || string.IsNullOrEmpty(path))
            {
                path = "/index.html";
            }

            string decoded = Uri.UnescapeDataString(path).TrimStart('/', '\\');
            string fullPath = Path.GetFullPath(Path.Combine(_root, decoded.Replace('/', Path.DirectorySeparatorChar)));

            if (!fullPath.StartsWith(_root, StringComparison.OrdinalIgnoreCase) || !File.Exists(fullPath))
            {
                context.Response.StatusCode = 404;
                byte[] notFound = Encoding.UTF8.GetBytes("404 Not Found: " + path);
                context.Response.ContentType = "text/plain; charset=utf-8";
                context.Response.ContentLength64 = notFound.Length;
                context.Response.OutputStream.Write(notFound, 0, notFound.Length);
                context.Response.Close();
                return;
            }

            string ext = Path.GetExtension(fullPath);
            string contentType;
            if (!MimeTypes.TryGetValue(ext, out contentType))
            {
                contentType = "application/octet-stream";
            }
            context.Response.ContentType = contentType;

            FileInfo fi = new FileInfo(fullPath);
            long fileLen = fi.Length;

            long start = 0;
            long end = fileLen - 1;
            bool isRange = false;

            string rangeHeader = context.Request.Headers["Range"];
            if (!string.IsNullOrEmpty(rangeHeader) && rangeHeader.StartsWith("bytes="))
            {
                try
                {
                    string rangeSpec = rangeHeader.Substring(6).Split(',')[0].Trim();
                    string[] parts = rangeSpec.Split('-');
                    if (string.IsNullOrEmpty(parts[0]))
                    {
                        long suffix = long.Parse(parts[1]);
                        start = Math.Max(0, fileLen - suffix);
                        end = fileLen - 1;
                        isRange = true;
                    }
                    else
                    {
                        start = long.Parse(parts[0]);
                        if (parts.Length > 1 && !string.IsNullOrEmpty(parts[1]))
                        {
                            end = long.Parse(parts[1]);
                        }
                        else
                        {
                            end = fileLen - 1;
                        }
                        isRange = true;
                    }

                    if (start > end || start >= fileLen)
                    {
                        context.Response.StatusCode = 416;
                        context.Response.Headers["Content-Range"] = "bytes */" + fileLen;
                        context.Response.Close();
                        return;
                    }
                }
                catch
                {
                    isRange = false;
                    start = 0;
                    end = fileLen - 1;
                }
            }

            if (isRange)
            {
                context.Response.StatusCode = 206;
                long length = end - start + 1;
                context.Response.ContentLength64 = length;
                context.Response.Headers["Content-Range"] = string.Format("bytes {0}-{1}/{2}", start, end, fileLen);
            }
            else
            {
                context.Response.StatusCode = 200;
                context.Response.ContentLength64 = fileLen;
            }

            using (FileStream fs = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            {
                if (start > 0)
                {
                    fs.Seek(start, SeekOrigin.Begin);
                }

                byte[] buffer = new byte[64 * 1024];
                long remaining = isRange ? (end - start + 1) : fileLen;
                while (remaining > 0)
                {
                    int toRead = (int)Math.Min((long)buffer.Length, remaining);
                    int read = fs.Read(buffer, 0, toRead);
                    if (read <= 0) break;
                    context.Response.OutputStream.Write(buffer, 0, read);
                    remaining -= read;
                }
            }
        }
        catch
        {
            // Client closed connection or cancelled
        }
        finally
        {
            try { context.Response.Close(); } catch { }
        }
    }

    public void Stop()
    {
        _running = false;
        if (_listener != null)
        {
            try { _listener.Stop(); } catch { }
            try { _listener.Close(); } catch { }
        }
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]'SimpleWebServer').Type) {
    Add-Type -TypeDefinition $csharpCode
}

$server = New-Object SimpleWebServer($RootDirectory)
$port = $server.Start($StartPort)
$url = "http://localhost:$port/"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Web server dang chay tai: $url" -ForegroundColor Green
Write-Host "  Thu muc goc: $RootDirectory" -ForegroundColor Gray
Write-Host "  Nhan Ctrl+C de dung server." -ForegroundColor Yellow
Write-Host "=================================================" -ForegroundColor Cyan

try {
    Start-Process $url
} catch {}

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    $server.Stop()
    Write-Host "`nServer da dung." -ForegroundColor Red
}
